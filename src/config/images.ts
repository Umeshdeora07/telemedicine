/**
 * Site photos. Free Pexels photos, loaded through next/image. next.config.ts
 * allows images.pexels.com only in the URL form built by `pexels()` below, so
 * add new Pexels photos by id here. To use your own picture, put the file in
 * public/images/site/ and change `src` to "/images/site/<file>". Keep the alt
 * text describing what the picture shows.
 *
 * Never use these on a named doctor: doctors are shown with their own
 * uploaded photo or an initials avatar.
 */
export type SitePhoto = {
  src: string;
  /** English alt text (pass it through t() when rendering). Use alt="" where the photo is decorative. */
  alt: string;
  /** Where the photo comes from. */
  credit: string;
};

const pexels = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;
const page = (id: number) => `https://www.pexels.com/photo/${id}/`;
const photo = (id: number, alt: string): SitePhoto => ({ src: pexels(id), alt, credit: page(id) });

export const PHOTOS = {
  onlineDoctor: photo(7195424, "A doctor talking with a patient on a video call"),
  onlineDoctorAlt: photo(8376177, "A doctor giving an online consultation at a desk"),
  patientAtHome: photo(7195087, "A woman at home looking at her laptop during an online consultation"),
  doctorPortrait: photo(19438560, "A doctor in a white coat with a stethoscope"),
  doctorCorridor: photo(4173251, "A doctor with a stethoscope standing in a clinic corridor"),
  hospitalCorridor: photo(33812023, "A clean, modern hospital corridor with a row of chairs"),
  medicalTeam: photo(6129499, "A team of doctors and nurses standing together"),
  traveller: photo(4173229, "A smiling traveller with a suitcase walking through an airport"),
  orthopaedics: photo(8376148, "A doctor explaining a foot X-ray to a patient"),
  orthopaedicsAlt: photo(4989189, "A doctor looking closely at an X-ray"),
  dermatology: photo(5701545, "A dermatologist examining skin with a magnifying glass"),
  generalPhysician: photo(7108344, "A health worker measuring a patient's blood pressure"),
  psychology: photo(8560221, "A man talking with a therapist during a counselling session"),
  support: photo(7682211, "A smiling woman from the support team wearing a headset"),
} as const satisfies Record<string, SitePhoto>;

export type PhotoName = keyof typeof PHOTOS;
