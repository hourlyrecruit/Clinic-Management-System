import { Dentist, Faq, Service, Testimonial } from './models';

export const CLINIC = {
  name: 'Lumina Dental Studio',
  shortName: 'Lumina',
  tagline: 'Calm, considered dentistry in Portland.',
  phoneDisplay: '(503) 555-0142',
  phoneHref: 'tel:+15035550142',
  emergencyPhoneDisplay: '(503) 555-0199',
  emergencyPhoneHref: 'tel:+15035550199',
  email: 'hello@luminadental.studio',
  addressLine1: '2180 NW Quimby Street, Suite 120',
  addressLine2: 'Portland, OR 97210',
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=2180+NW+Quimby+Street+Portland+OR+97210',
  rating: '4.9',
  reviewCount: 312,
  patientCount: '1,200+',
  established: 2014,
} as const;

export const HOURS = [
  { day: 'Monday – Thursday', time: '8:00 AM – 6:00 PM' },
  { day: 'Friday', time: '8:00 AM – 4:00 PM' },
  { day: 'Saturday', time: '9:00 AM – 2:00 PM' },
  { day: 'Sunday', time: 'Closed' },
] as const;

export const SERVICES: readonly Service[] = [
  {
    id: 'preventive',
    name: 'Check-ups & hygiene',
    summary: 'Gentle cleanings, digital imaging and prevention that actually fits your life.',
    description:
      'A thorough, unhurried exam with digital X-rays, a gentle clean and a clear plan for what — if anything — needs attention next.',
    icon: 'shield',
    duration: '45 min',
    fromPrice: '$95',
    highlights: ['Digital low-dose X-rays', 'Same-visit treatment plan'],
  },
  {
    id: 'aligners',
    name: 'Clear aligners',
    summary: 'Invisalign® treatment planned by our orthodontic lead, without the metal.',
    description:
      'Straighten your smile discreetly with a plan built around your bite. Includes 3D scanning, retainers and monthly check-ins.',
    icon: 'align',
    duration: '30 min scan',
    fromPrice: '$2,900',
    highlights: ['3D digital scan', '0% financing available'],
    featured: true,
  },
  {
    id: 'whitening',
    name: 'Teeth whitening',
    summary: 'A brighter smile in one visit, with results you can maintain at home.',
    description:
      'In-studio whitening with desensitising care, plus custom take-home trays so the shade you leave with is the shade you keep.',
    icon: 'sparkles',
    duration: '60 min',
    fromPrice: '$420',
    highlights: ['Sensitivity-safe formula', 'Custom take-home trays'],
  },
  {
    id: 'veneers',
    name: 'Porcelain veneers',
    summary: 'Hand-layered porcelain designed around your face, not a template.',
    description:
      'A considered approach to reshaping chipped, worn or uneven teeth — from digital preview through to final bonding.',
    icon: 'tooth',
    duration: '2 visits',
    fromPrice: '$850 / tooth',
    highlights: ['Digital smile preview', 'Hand-layered porcelain'],
  },
  {
    id: 'implants',
    name: 'Dental implants',
    summary: 'Replace a missing tooth with something that feels like your own.',
    description:
      'Guided implant placement with 3D planning, followed by a custom crown crafted to blend with your neighbouring teeth.',
    icon: 'implant',
    duration: '3–6 months',
    fromPrice: '$2,400',
    highlights: ['Guided 3D placement', 'Single-tooth or full-arch'],
  },
  {
    id: 'children',
    name: "Children's dentistry",
    summary: 'First visits and check-ups paced for small humans and big feelings.',
    description:
      'A calm introduction to dental care with plenty of explanation, positive reinforcement and absolutely no surprises.',
    icon: 'smile',
    duration: '40 min',
    fromPrice: '$75',
    highlights: ['Ages 2 and up', 'Built-in fun first'],
  },
] as const;

export const DENTISTS: readonly Dentist[] = [
  {
    id: 'ada',
    name: 'Dr. Ada Bennett',
    role: 'Clinical Director · Restorative & Cosmetic',
    focus: ['Veneers', 'Implants', 'Nervous patients'],
    bio: 'Ada founded Lumina in 2014 with one rule: never rush a patient. She lectures on minimally invasive cosmetic dentistry.',
    image: 'images/dentist-ada.jpg',
    availability: 'Next opening: this week',
    years: 14,
  },
  {
    id: 'maya',
    name: 'Dr. Maya Okafor',
    role: 'Orthodontic Lead · Clear Aligners',
    focus: ['Invisalign®', 'Bite health', 'Teens'],
    bio: 'Maya has guided more than 800 aligner cases. She is the person who will tell you honestly if clear aligners are the wrong choice.',
    image: 'images/dentist-maya.jpg',
    availability: 'Next opening: within 3 days',
    years: 11,
  },
  {
    id: 'daniel',
    name: 'Dr. Daniel Reyes',
    role: 'Family & Preventive Dentist',
    focus: ['Hygiene', 'Children', 'Emergency care'],
    bio: 'Daniel looks after entire families, from first teeth to full-arch care. He is known for a very steady hand and a very bad joke.',
    image: 'images/dentist-daniel.jpg',
    availability: 'Next opening: tomorrow',
    years: 9,
  },
] as const;

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    quote:
      'I had put off the dentist for six years. Nobody made me feel silly about it — they just made a plan, started small, and checked in as we went.',
    name: 'Priya S.',
    treatment: 'Hygiene & clear aligners',
  },
  {
    quote:
      'Our daughter was nervous and Daniel sat on the floor with her for ten minutes before he even picked up a mirror. She now asks when we are going back.',
    name: 'Marcus L.',
    treatment: 'Family dentistry',
  },
  {
    quote:
      'First time I have ever left a dental appointment feeling calm. The space feels like a hotel, the team explains everything, and the veneers look like me.',
    name: 'Elena R.',
    treatment: 'Porcelain veneers',
  },
] as const;

export const FAQS: readonly Faq[] = [
  {
    question: 'Do you accept my dental insurance?',
    answer:
      'We are in-network with Delta Dental, Cigna, Aetna and MetLife, and we submit claims for most other plans. Send a photo of your insurance card through the care chat and we will confirm your cover before your appointment.',
  },
  {
    question: 'What happens at a first visit?',
    answer:
      'A first visit is 45–60 minutes: we review your history, take low-dose digital X-rays, complete a gentle exam and cleaning, then talk through options and costs together. You will never be pressured into treatment on the day.',
  },
  {
    question: 'Can I be seen for an emergency?',
    answer:
      'Yes. We hold same-day slots for toothache, breakages and swelling. Call our emergency line on (503) 555-0199 before 4:00 PM and we will fit you in or advise on urgent care.',
  },
  {
    question: 'Is treatment painful? What about anxious patients?',
    answer:
      'Comfort is a big part of what we do: numbing gel before every injection, noise-cancelling headphones, ceiling screens and pacing breaks. We also offer oral sedation for longer treatment when appropriate.',
  },
  {
    question: 'How does the free consultation work?',
    answer:
      'A 15-minute conversation with a clinician — in person or on the phone — with no charge and no obligation. Bring your questions about treatment, timing, anxiety or cost, and we will give you an honest answer.',
  },
  {
    question: 'What is your cancellation policy?',
    answer:
      'We ask for 24 hours notice so the slot can go to another patient. Late cancellations and no-shows may incur a $50 fee, which we waive in genuine emergencies.',
  },
] as const;

export const TIME_SLOTS: readonly string[] = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
] as const;

export const QUICK_TOPICS: readonly string[] = [
  'Book an appointment',
  'Opening hours',
  'Dental emergency',
  'Insurance & pricing',
] as const;

export function serviceById(id: string): Service | undefined {
  return SERVICES.find((service) => service.id === id);
}

export function dentistById(id: string): Dentist | undefined {
  return DENTISTS.find((dentist) => dentist.id === id);
}
