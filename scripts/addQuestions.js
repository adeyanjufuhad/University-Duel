import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, '../src/data/question-bank.json');
const current = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const newQuestionsRaw = [
  {
    "id": 1,
    "question": "\"Dentist\" is to \"Teeth\" as \"Chiropodist\" is to",
    "category": "Verbal Reasoning",
    "options": ["Eyes", "Feet", "Skin"],
    "correct_answer": "Feet",
    "explanation": "A dentist specializes in the care of teeth, while a chiropodist (podiatrist) specializes in the care of feet."
  },
  {
    "id": 2,
    "question": "A dataset has mean 70 and standard deviation 10. What percentage of values lie below 80?",
    "category": "Data Analysis & Statistics",
    "options": ["21%", "42%", "84%"],
    "correct_answer": "84%",
    "explanation": "Assuming a normal distribution, the value 80 is 1 standard deviation above the mean (Z = 1). Approximately 50% + 34.13% ≈ 84% of the distribution lies below this value."
  },
  {
    "id": 3,
    "question": "Which African leader promoted \"Consciencism\"?",
    "category": "General Knowledge",
    "options": ["Julius Nyerere", "Kwame Nkrumah", "Haile Selassie"],
    "correct_answer": "Kwame Nkrumah",
    "explanation": "Kwame Nkrumah, Ghana's first president, published 'Consciencism: Philosophy and Ideology for Decolonization' in 1964."
  },
  {
    "id": 4,
    "question": "Six boxes are stacked. Box 3 is above Box 6. Box 1 is below Box 4. Box 5 is above Box 2. Which box is at the bottom?",
    "category": "Logical Reasoning",
    "options": ["Box 1", "Box 6", "Box 2"],
    "correct_answer": "Cannot be determined",
    "explanation": "Based purely on the premises (3 > 6, 4 > 1, 5 > 2), any of Box 6, Box 1, or Box 2 could be at the absolute bottom."
  },
  {
    "id": 5,
    "question": "The profit P(q) = 4q² + 240q - 100. Find the quantity for the minimum profit.",
    "category": "Applied Mathematics",
    "options": [],
    "correct_answer": "-30",
    "explanation": "Setting the derivative dP/dq = 8q + 240 = 0 gives q = -240 / 8 = -30."
  },
  {
    "id": 6,
    "question": "From a 52-card deck, what is probability of drawing a spade or a face card?",
    "category": "Probability",
    "options": ["10/26", "8/26", "11/26"],
    "correct_answer": "11/26",
    "explanation": "There are 13 spades and 12 face cards (J, Q, K of each suit), with 3 overlapping spade face cards. P(Spade ∪ Face) = (13 + 12 - 3) / 52 = 22 / 52 = 11/26."
  },
  {
    "id": 7,
    "question": "Who was the first Secretary-General of the Organization of African Unity (OAU)?",
    "category": "General Knowledge",
    "options": ["Salim Ahmed Salim", "Diallo Telli", "Amara Essy"],
    "correct_answer": "Diallo Telli",
    "explanation": "Diallo Telli of Guinea served as the first Secretary-General of the OAU from 1964 to 1972."
  },
  {
    "id": 8,
    "question": "At 4:20 AM, what is the exact angle between the hour and minute hands of a clock?",
    "category": "Applied Mathematics",
    "options": ["20°", "10°", "130°"],
    "correct_answer": "10°",
    "explanation": "Minute hand at 20 min = 20 × 6° = 120°. Hour hand at 4:20 = 4 × 30° + (20 × 0.5°) = 120° + 10° = 130°. Difference = 130° - 120° = 10°."
  },
  {
    "id": 9,
    "question": "In University grading CGPA stands for",
    "category": "General Knowledge",
    "options": [
      "Central general pass average",
      "College grade percentage average",
      "Cumulative grade points average"
    ],
    "correct_answer": "Cumulative grade points average",
    "explanation": "CGPA standardly stands for Cumulative Grade Point Average."
  },
  {
    "id": 10,
    "question": "Which African food is UNESCO heritage?",
    "category": "General Knowledge",
    "options": ["Sadza", "Jollof rice", "Couscous"],
    "correct_answer": "Couscous",
    "explanation": "In 2020, UNESCO inscribed the knowledge, know-how, and practices pertaining to the production and consumption of couscous onto the Representative List of the Intangible Cultural Heritage of Humanity."
  },
  {
    "id": 11,
    "question": "What is the power if 100 Joules of work is done in 5 seconds?",
    "category": "Applied Physics",
    "options": ["20W", "40W", "10W"],
    "correct_answer": "20W",
    "explanation": "Power = Work / Time = 100 J / 5 s = 20 Watts."
  },
  {
    "id": 12,
    "question": "A pizza is divided into 8 slices. If 3 people eat 2 slices each, what fraction remains?",
    "category": "Applied Mathematics",
    "options": ["1/4", "1/8", "1/2"],
    "correct_answer": "1/4",
    "explanation": "Slices eaten = 3 × 2 = 6 slices. Slices remaining = 8 - 6 = 2 slices. Remaining fraction = 2 / 8 = 1/4."
  },
  {
    "id": 13,
    "question": "What is the minimum number of edges a graph with 5 vertices must have to guarantee it is connected?",
    "category": "Discrete Mathematics / Graph Theory",
    "options": ["4", "10", "6"],
    "correct_answer": "4",
    "explanation": "A tree with n vertices requires n - 1 edges to be connected (5 - 1 = 4)."
  },
  {
    "id": 14,
    "question": "If you randomly pick a year between 1980 and 2020, what is the chance it's a leap year?",
    "category": "Probability",
    "options": [],
    "correct_answer": "11/41",
    "explanation": "Inclusive count of years from 1980 to 2020 is (2020 - 1980) + 1 = 41 years. Leap years occur every 4 years: 1980, 1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020 (total of 11 leap years). Probability = 11/41."
  },
  {
    "id": 15,
    "question": "Which African country is home to the musician Mory Kanté, famous for the hit song \"Yéké Yéké\"?",
    "category": "General Knowledge",
    "options": ["Senegal", "Guinea", "Mali"],
    "correct_answer": "Guinea",
    "explanation": "Mory Kanté was a Guinean vocalist and kora player."
  },
  {
    "id": 16,
    "question": "Juliet invests $450 at 20% interest for one year. What is her total amount at year end?",
    "category": "Applied Mathematics",
    "options": ["$540", "$470", "$500"],
    "correct_answer": "$540",
    "explanation": "Interest = $450 × 0.20 = $90. Total amount = $450 + $90 = $540."
  },
  {
    "id": 17,
    "question": "Calculate the mean of 6, 8, 10, 12, and 14.",
    "category": "Data Analysis & Statistics",
    "options": [],
    "correct_answer": "10",
    "explanation": "Sum = 6 + 8 + 10 + 12 + 14 = 50. Mean = 50 / 5 = 10."
  },
  {
    "id": 18,
    "question": "Who was the Egyptian king whose tomb and treasures were discovered in the Valley of the Kings in 1922?",
    "category": "General Knowledge",
    "options": ["Akhenaten", "Tutankhamun", "Ramses II"],
    "correct_answer": "Tutankhamun",
    "explanation": "Howard Carter discovered the intact tomb of Pharaoh Tutankhamun in November 1922."
  },
  {
    "id": 19,
    "question": "What is the speed of a wave with frequency 5 hertz and wavelength 3 metres?",
    "category": "Applied Physics",
    "options": ["10 ms⁻¹", "12 ms⁻¹", "15 ms⁻¹"],
    "correct_answer": "15 ms⁻¹",
    "explanation": "Wave speed v = f × λ = 5 Hz × 3 m = 15 m/s."
  },
  {
    "id": 20,
    "question": "What is a major challenge of urban transport in Cairo, Egypt?",
    "category": "General Knowledge",
    "options": ["Severe traffic congestion", "Many electric cars", "Lack of bridges"],
    "correct_answer": "Severe traffic congestion",
    "explanation": "Cairo is widely documented as facing severe automotive density and traffic congestion challenges."
  },
  {
    "id": 21,
    "question": "If 3 machines make 3 widgets in 3 minutes, how long for 100 machines to make 150 widgets?",
    "category": "Applied Mathematics",
    "options": ["300 minutes", "4.5 minutes", "100 minutes"],
    "correct_answer": "4.5 minutes",
    "explanation": "1 machine produces 1 widget in 3 minutes (rate = 1/3 widget/min per machine). 100 machines produce 100 × (1/3) = 100/3 widgets/min. Time = 150 / (100/3) = 450 / 100 = 4.5 minutes."
  },
  {
    "id": 22,
    "question": "Initial population: 1 million. Birth rate: 20 per 1000 per year. Find the population after 1 year (no deaths/migration).",
    "category": "Data Analysis & Statistics",
    "options": ["1,020,000", "240,000", "1,040,000"],
    "correct_answer": "1,020,000",
    "explanation": "Births in 1 year = (20 / 1000) × 1,000,000 = 20,000. New population = 1,000,000 + 20,000 = 1,020,000."
  },
  {
    "id": 23,
    "question": "For numbers evenly distributed between 15 and 75, what is the probability of picking one below 30?",
    "category": "Probability",
    "options": ["1/4", "1/5", "1/2"],
    "correct_answer": "1/4",
    "explanation": "Interval length = 75 - 15 = 60. Sub-interval below 30 = [15, 30], which has length 30 - 15 = 15. Probability = 15 / 60 = 1/4."
  },
  {
    "id": 24,
    "question": "The Hausa/Fulani men in Nigeria often wear a long gown called",
    "category": "General Knowledge",
    "options": ["Kaftan", "Agbada", "Babariga"],
    "correct_answer": "Babariga",
    "explanation": "Babban Riga (commonly rendered as Babariga) is the voluminous flowing gown traditionally worn by Hausa and Fulani men."
  },
  {
    "id": 25,
    "question": "Which is the odd one: Auxin, Cytokinin, Haemoglobin, Gibberellin?",
    "category": "General Knowledge",
    "options": ["Auxin", "Cytokinin", "Haemoglobin", "Gibberellin"],
    "correct_answer": "Haemoglobin",
    "explanation": "Auxin, Cytokinin, and Gibberellin are plant growth hormones, whereas Haemoglobin is an animal respiratory protein."
  },
  {
    "id": 26,
    "question": "A charge q = 3C experiences F = 180 Newton. What is the Electric field?",
    "category": "Applied Physics",
    "options": [],
    "correct_answer": "60 N/C",
    "explanation": "Electric field E = F / q = 180 N / 3 C = 60 N/C."
  },
  {
    "id": 27,
    "question": "Which of these countries is definitely in Africa, often associated with dense jungles and Tarzan vibes?",
    "category": "General Knowledge",
    "options": ["Peru", "Thailand", "Congo"],
    "correct_answer": "Congo",
    "explanation": "The Republic of the Congo and the DRC are located in Central Africa, dominated by the Congo Basin rainforest."
  },
  {
    "id": 28,
    "question": "TCP is to Reliable Delivery as UDP is to",
    "category": "Verbal Reasoning / Computing",
    "options": ["Encryption", "Compression", "Connectionless"],
    "correct_answer": "Connectionless",
    "explanation": "TCP is a connection-oriented, reliable transmission protocol, whereas UDP is connectionless and best-effort."
  },
  {
    "id": 29,
    "question": "Find the sum of the infinite geometric series: 5 + 2.5 + 1.25 + ...",
    "category": "Applied Mathematics",
    "options": ["15", "12.5", "10"],
    "correct_answer": "10",
    "explanation": "First term a = 5, common ratio r = 0.5. Sum = a / (1 - r) = 5 / (1 - 0.5) = 5 / 0.5 = 10."
  },
  {
    "id": 30,
    "question": "The hydropower station near Jinja on the Victoria Nile is",
    "category": "General Knowledge",
    "options": ["Ruzizi II", "Bujagali", "Inga I"],
    "correct_answer": "Bujagali",
    "explanation": "The Bujagali Power Station is located across the Victoria Nile near Jinja, Uganda."
  },
  {
    "id": 31,
    "question": "In a group, 60% own a car, 40% a bike, and 30% both. What percentage owns neither?",
    "category": "Applied Mathematics / Set Theory",
    "options": ["70%", "50%", "30%"],
    "correct_answer": "30%",
    "explanation": "P(Car ∪ Bike) = P(Car) + P(Bike) - P(Both) = 60% + 40% - 30% = 70%. Owning neither = 100% - 70% = 30%."
  },
  {
    "id": 32,
    "question": "Which South African DJ is credited with globalizing Amapiano music?",
    "category": "General Knowledge",
    "options": ["DJ Maphorisa", "Kabza De Small", "Black Coffee"],
    "correct_answer": "Kabza De Small",
    "explanation": "Kabza De Small is widely referred to as the 'King of Amapiano' and credited as a primary pioneer in globalizing the genre."
  },
  {
    "id": 33,
    "question": "If 6 workers can build 4 cabinets in 3 days, how many days will it take for 18 workers to build 20 cabinets?",
    "category": "Applied Mathematics",
    "options": ["4 days", "5 days", "6 days"],
    "correct_answer": "5 days",
    "explanation": "Total work in worker-days = (6 workers × 3 days) / 4 cabinets = 4.5 worker-days per cabinet. To build 20 cabinets takes 20 × 4.5 = 90 worker-days. With 18 workers: 90 / 18 = 5 days."
  },
  {
    "id": 34,
    "question": "A toy company's revenue from selling x units is R(x) = 120x - 6x². Find x for maximum revenue.",
    "category": "Applied Mathematics",
    "options": [],
    "correct_answer": "10 units",
    "explanation": "Taking the derivative dR/dx = 120 - 12x = 0 gives 12x = 120, hence x = 10 units."
  }
];

function mapCategory(cat) {
  const c = cat.toLowerCase();
  if (c.includes('math') || c.includes('physics') || c.includes('graph')) return 'Applied Math';
  if (c.includes('data') || c.includes('statistics') || c.includes('probability')) return 'Data Analysis';
  if (c.includes('verbal') || c.includes('logical') || c.includes('computing')) return 'Verbal Reasoning';
  return 'General Knowledge';
}

const diffs = [
  'easy', 'medium', 'medium', 'hard', 'hard', 'medium', 'hard', 'medium',
  'easy', 'easy', 'easy', 'easy', 'medium', 'hard', 'medium', 'easy',
  'easy', 'easy', 'easy', 'easy', 'hard', 'medium', 'medium', 'easy',
  'easy', 'medium', 'easy', 'medium', 'medium', 'hard', 'medium', 'easy',
  'hard', 'hard'
];

// Check if any are already present
const existingIds = new Set(current.questions.map(q => q.id));

const formattedNew = newQuestionsRaw.map((q, idx) => {
  const idStr = 'UD' + String(idx + 1).padStart(2, '0');
  return {
    id: idStr,
    category: mapCategory(q.category),
    difficulty: diffs[idx] || 'medium',
    question: q.question,
    answer: q.correct_answer || 'Cannot be determined',
    options: q.options || [],
    explanation: q.explanation || ''
  };
}).filter(q => !existingIds.has(q.id));

current.questions.push(...formattedNew);
fs.writeFileSync(jsonPath, JSON.stringify(current, null, 2));
console.log('Successfully updated question bank! Total questions:', current.questions.length);
