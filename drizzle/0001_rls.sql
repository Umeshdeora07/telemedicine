-- Row-level security for medical records.
--
-- The application connects as the table owner, which bypasses RLS. Requests
-- that read or write medical data run inside withRls() (src/db/index.ts),
-- which switches to the non-owner role "app_rls" and sets app.user_id and
-- app.role for the transaction. The policies below then decide which rows
-- that user may see, so a bug in application code cannot leak another
-- patient's records.
--
-- Rules:
--   * Patients (and caregivers with an active, consented family link) see
--     their own records.
--   * Doctors see notes and prescriptions they wrote, documents attached to
--     their own consults, and anything else only with an active patient
--     grant (record_access_grants).
--   * Clinic coordinators see the online consult notes, prescriptions and
--     reports linked to a visit at their clinic, and case documents for
--     international cases assigned to their clinic.
--   * Care coordinators and admins see patient profiles (for bookings and
--     support) but never notes, prescriptions, documents or messages.

-- The app's database user needs CREATEROLE (true for Neon, Render, Supabase,
-- RDS and DigitalOcean defaults). Roles belong to the whole server, so if
-- app_rls already exists, made by another user, an administrator must grant it.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rls') THEN
    CREATE ROLE app_rls NOLOGIN;
  END IF;
  -- Always grant, even right after CREATE ROLE: since PostgreSQL 16 the
  -- creator is made a member automatically but without the right to SET ROLE.
  BEGIN
    EXECUTE format('GRANT app_rls TO %I', current_user);
  EXCEPTION WHEN insufficient_privilege THEN
    -- Fine if an administrator has already granted it.
    IF NOT pg_has_role(current_user, 'app_rls', 'MEMBER') THEN
      RAISE EXCEPTION 'Role app_rls exists but % may not use it.', current_user
        USING HINT = format('As an administrator, run: GRANT app_rls TO %I;', current_user);
    END IF;
  END;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_rls;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rls;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rls;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rls;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_rls;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('app.role', true), ''), 'anonymous')
$$;
--> statement-breakpoint

-- The patient themself, or a caregiver with an active consented link.
CREATE OR REPLACE FUNCTION app_is_patient_side(p uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM patients WHERE id = p AND user_id = app_uid() AND deleted_at IS NULL)
    OR EXISTS (
      SELECT 1 FROM family_links
      WHERE patient_id = p AND caregiver_user_id = app_uid() AND status = 'active' AND can_view_records
    )
  )
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_doctor_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM doctors WHERE app_role() = 'doctor' AND user_id = app_uid() LIMIT 1
$$;
--> statement-breakpoint

-- Doctor holds an active, unexpired patient grant to see history.
CREATE OR REPLACE FUNCTION app_doctor_has_grant(p uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM record_access_grants g
    WHERE g.patient_id = p AND g.doctor_id = app_doctor_id()
      AND g.revoked_at IS NULL AND g.expires_at > now()
  )
$$;
--> statement-breakpoint

-- Doctor may see the patient's profile: any live or past consult with them,
-- an assigned second opinion or international case, or a grant.
CREATE OR REPLACE FUNCTION app_doctor_knows_patient(p uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_doctor_id() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = p AND a.doctor_id = app_doctor_id()
        AND a.status IN ('confirmed', 'checked_in', 'in_progress', 'completed')
    )
    OR EXISTS (SELECT 1 FROM second_opinions s WHERE s.patient_id = p AND s.doctor_id = app_doctor_id())
    OR EXISTS (SELECT 1 FROM international_cases c WHERE c.patient_id = p AND c.assigned_doctor_id = app_doctor_id())
    OR app_doctor_has_grant(p)
  )
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_doctor_owns_appointment(appt uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM appointments WHERE id = appt AND doctor_id = app_doctor_id())
$$;
--> statement-breakpoint

-- Clinic staff: appointment is a visit at their clinic, or is the online
-- consult that a visit at their clinic came from.
CREATE OR REPLACE FUNCTION app_clinic_sees_appointment(appt uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_role() = 'clinic_coordinator' AND EXISTS (
    SELECT 1 FROM appointments v
    JOIN clinic_staff cs ON cs.clinic_id = v.clinic_id AND cs.user_id = app_uid()
    WHERE v.status IN ('confirmed', 'checked_in', 'in_progress', 'completed')
      AND (v.id = appt OR v.parent_appointment_id = appt)
  )
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_clinic_knows_patient(p uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_role() = 'clinic_coordinator' AND (
    EXISTS (
      SELECT 1 FROM appointments v
      JOIN clinic_staff cs ON cs.clinic_id = v.clinic_id AND cs.user_id = app_uid()
      WHERE v.patient_id = p
    )
    OR EXISTS (
      SELECT 1 FROM international_cases c
      JOIN clinic_staff cs ON cs.clinic_id = c.assigned_clinic_id AND cs.user_id = app_uid()
      WHERE c.patient_id = p
    )
  )
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_clinic_sees_case(case_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_role() = 'clinic_coordinator' AND EXISTS (
    SELECT 1 FROM international_cases c
    JOIN clinic_staff cs ON cs.clinic_id = c.assigned_clinic_id AND cs.user_id = app_uid()
    WHERE c.id = case_id
  )
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_doctor_sees_document(d documents) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_doctor_id() IS NOT NULL AND (
    d.doctor_id = app_doctor_id()
    OR (d.appointment_id IS NOT NULL AND app_doctor_owns_appointment(d.appointment_id))
    OR (d.patient_id IS NOT NULL AND app_doctor_has_grant(d.patient_id))
    OR EXISTS (
      SELECT 1 FROM second_opinions s
      WHERE s.doctor_id = app_doctor_id() AND d.id = ANY (s.document_ids)
    )
    OR EXISTS (
      SELECT 1 FROM international_cases c
      WHERE c.id = d.case_id AND c.assigned_doctor_id = app_doctor_id()
    )
    OR EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.doctor_id = app_doctor_id()
        AND a.pre_consult IS NOT NULL
        AND a.pre_consult -> 'documentIds' ? d.id::text
    )
  )
$$;
--> statement-breakpoint

-- ------------------------------------------------------------- patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY patients_select ON patients FOR SELECT TO app_rls USING (
  app_role() = 'system'
  OR user_id = app_uid()
  OR app_is_patient_side(id)
  OR app_doctor_knows_patient(id)
  OR app_clinic_knows_patient(id)
  OR app_role() IN ('care_coordinator', 'super_admin')
);
--> statement-breakpoint
CREATE POLICY patients_insert ON patients FOR INSERT TO app_rls WITH CHECK (
  app_role() = 'system' OR owner_user_id = app_uid() OR app_role() = 'care_coordinator'
);
--> statement-breakpoint
CREATE POLICY patients_update ON patients FOR UPDATE TO app_rls
  USING (app_role() = 'system' OR user_id = app_uid() OR app_is_patient_side(id))
  WITH CHECK (app_role() = 'system' OR user_id = app_uid() OR app_is_patient_side(id));
--> statement-breakpoint

-- ------------------------------------------------------------ documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY documents_select ON documents FOR SELECT TO app_rls USING (
  deleted_at IS NULL AND (
    app_role() = 'system'
    OR (patient_id IS NOT NULL AND app_is_patient_side(patient_id))
    OR app_doctor_sees_document(documents)
    OR (appointment_id IS NOT NULL AND app_clinic_sees_appointment(appointment_id))
    OR (case_id IS NOT NULL AND app_clinic_sees_case(case_id))
    OR (doctor_id IS NOT NULL AND patient_id IS NULL AND app_role() = 'super_admin')
    OR (clinic_id IS NOT NULL AND patient_id IS NULL AND app_role() = 'super_admin')
  )
);
--> statement-breakpoint
CREATE POLICY documents_insert ON documents FOR INSERT TO app_rls WITH CHECK (
  app_role() = 'system' OR uploaded_by_user_id = app_uid()
);
--> statement-breakpoint
CREATE POLICY documents_update ON documents FOR UPDATE TO app_rls
  USING (app_role() = 'system' OR uploaded_by_user_id = app_uid() OR (patient_id IS NOT NULL AND app_is_patient_side(patient_id)))
  WITH CHECK (app_role() = 'system' OR uploaded_by_user_id = app_uid() OR (patient_id IS NOT NULL AND app_is_patient_side(patient_id)));
--> statement-breakpoint

-- -------------------------------------------------------- consult_notes
ALTER TABLE consult_notes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY notes_select ON consult_notes FOR SELECT TO app_rls USING (
  app_role() = 'system'
  OR app_is_patient_side(patient_id)
  OR doctor_id = app_doctor_id()
  OR app_doctor_has_grant(patient_id)
  OR app_clinic_sees_appointment(appointment_id)
);
--> statement-breakpoint
CREATE POLICY notes_write ON consult_notes FOR ALL TO app_rls
  USING (app_role() = 'system' OR doctor_id = app_doctor_id())
  WITH CHECK (app_role() = 'system' OR (doctor_id = app_doctor_id() AND app_doctor_owns_appointment(appointment_id)));
--> statement-breakpoint

-- -------------------------------------------------------- prescriptions
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY rx_select ON prescriptions FOR SELECT TO app_rls USING (
  app_role() = 'system'
  OR app_is_patient_side(patient_id)
  OR doctor_id = app_doctor_id()
  OR app_doctor_has_grant(patient_id)
  OR app_clinic_sees_appointment(appointment_id)
);
--> statement-breakpoint
CREATE POLICY rx_write ON prescriptions FOR ALL TO app_rls
  USING (app_role() = 'system' OR doctor_id = app_doctor_id())
  WITH CHECK (app_role() = 'system' OR (doctor_id = app_doctor_id() AND app_doctor_owns_appointment(appointment_id)));
--> statement-breakpoint

ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY rx_items_select ON prescription_items FOR SELECT TO app_rls USING (
  app_role() = 'system'
  OR EXISTS (SELECT 1 FROM prescriptions p WHERE p.id = prescription_id)
);
--> statement-breakpoint
CREATE POLICY rx_items_write ON prescription_items FOR ALL TO app_rls
  USING (app_role() = 'system' OR EXISTS (SELECT 1 FROM prescriptions p WHERE p.id = prescription_id AND p.doctor_id = app_doctor_id()))
  WITH CHECK (app_role() = 'system' OR EXISTS (SELECT 1 FROM prescriptions p WHERE p.id = prescription_id AND p.doctor_id = app_doctor_id()));
--> statement-breakpoint

-- ------------------------------------------------------------- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY messages_select ON messages FOR SELECT TO app_rls USING (
  app_role() = 'system'
  OR app_is_patient_side(patient_id)
  OR (appointment_id IS NOT NULL AND app_doctor_owns_appointment(appointment_id))
  OR (case_id IS NOT NULL AND app_clinic_sees_case(case_id))
);
--> statement-breakpoint
CREATE POLICY messages_insert ON messages FOR INSERT TO app_rls WITH CHECK (
  app_role() = 'system'
  OR (sender_user_id = app_uid() AND (
    app_is_patient_side(patient_id)
    OR (appointment_id IS NOT NULL AND app_doctor_owns_appointment(appointment_id))
    OR (case_id IS NOT NULL AND app_clinic_sees_case(case_id))
  ))
);
--> statement-breakpoint

-- ------------------------------------------------------------- readings
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY readings_select ON readings FOR SELECT TO app_rls USING (
  app_role() = 'system'
  OR app_is_patient_side(patient_id)
  OR app_doctor_has_grant(patient_id)
  OR EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.care_doctor_id = app_doctor_id() AND s.status = 'active' AND patient_id = ANY (s.patient_ids)
  )
);
--> statement-breakpoint
CREATE POLICY readings_write ON readings FOR ALL TO app_rls
  USING (app_role() = 'system' OR app_is_patient_side(patient_id))
  WITH CHECK (app_role() = 'system' OR app_is_patient_side(patient_id));
