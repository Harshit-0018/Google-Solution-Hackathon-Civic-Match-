import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export const URGENCY_LABELS = {
  1: "LOW",
  2: "MODERATE",
  3: "ELEVATED",
  4: "HIGH",
  5: "CRITICAL",
};

export const CATEGORIES = [
  { value: "education", label: "EDUCATION" },
  { value: "healthcare", label: "HEALTHCARE" },
  { value: "disaster", label: "DISASTER RELIEF" },
  { value: "environment", label: "ENVIRONMENT" },
  { value: "other", label: "OTHER" },
];

export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "ml", name: "Malayalam" },
  { code: "ta", name: "Tamil" },
  { code: "kn", name: "Kannada" },
  { code: "te", name: "Telugu" },
];

export const BADGES = {
  first_responder: { label: "First Responder", desc: "Completed first task" },
  skill_champion: { label: "Skill Champion", desc: "5 tasks in same category" },
  community_hero: { label: "Community Hero", desc: "1000+ points earned" },
  speed_volunteer: { label: "Speed Volunteer", desc: "Quick response" },
  multilingual: { label: "Multilingual", desc: "Cross-language service" },
};
