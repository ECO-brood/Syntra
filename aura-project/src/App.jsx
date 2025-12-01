import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, Activity, MessageSquare, Sparkles, ArrowRight, X, Play, RotateCcw, Lock, Target,
  FileText, Zap, BarChart3, BookOpen, Microscope, CheckCircle2, ChevronRight, Terminal,
  Layers, Clock, Music, ListTodo, Compass, Plus, Save, Trash2, AlertTriangle, Settings,
  Lightbulb, TrendingUp, User, Globe, Languages, Loader2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, 
  limit, doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, writeBatch
} from 'firebase/firestore';

// --- Configuration Helper ---
const getEnv = (key) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key] || "";
    }
  } catch (e) { console.warn("Env error"); }
  return "";
};

const apiKey = getEnv("VITE_GEMINI_API_KEY");

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID")
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'aura-production-v1';

// --- SJT DATA (Based on your Criteria Document) ---
const SJT_QUESTIONS = [
    // --- CONSCIENTIOUSNESS (C) ---
    {
        id: 'c1_study_stress', // Criterion: Action under stress
        text: "You have a massive final exam in 3 days. You planned to study Chapter 4 today, but you woke up feeling mentally exhausted and foggy.",
        options: [
            { text: "Push through the fog and stick to the schedule exactly as planned.", score: 3 }, // High C (Discipline)
            { text: "Modify the plan: study easier concepts today to keep momentum without burning out.", score: 2 }, // Mod C (Adaptability)
            { text: "Take the day off to recover; I'll cram double tomorrow.", score: 0 }, // Low C (Procrastination risk)
            { text: "Wait until I feel 'inspired' or energetic to start.", score: 1 } // Low C (Mood dependent)
        ],
        trait: 'C'
    },
    {
        id: 'c2_environment', // Criterion: Habits/Environment
        text: "You are working on a personal passion project. Your workspace has become cluttered with papers, cups, and cables over the week.",
        options: [
            { text: "I stop immediately to clean everything. I can't focus in a mess.", score: 3 },
            { text: "I ignore the mess completely; it doesn't affect my workflow.", score: 0 },
            { text: "I clear just enough space to work now and clean properly later.", score: 1 },
            { text: "I tidy up at the end of every day so it never gets this bad.", score: 3 } 
        ],
        trait: 'C'
    },
    {
        id: 'c3_frustration', // Criterion: Frustration/Resilience (Reversed)
        text: "You spent 2 hours writing an essay, but your computer crashed and you lost the last hour of work. You have no backup.",
        options: [
            { text: "Feel crushed, close the laptop, and decide to do it tomorrow.", score: 0 },
            { text: "Take a 10-minute walk to cool down, then rewrite it immediately while my memory is fresh.", score: 3 },
            { text: "Try to rewrite it, but with less effort/detail this time.", score: 1 },
            { text: "Panic and spend an hour looking for a recovery tool before writing.", score: 2 }
        ],
        trait: 'C'
    },
    {
        id: 'c4_interaction', // Criterion: Group Responsibility
        text: "In a group project, the leader is disorganized and the deadline is approaching fast. No one is taking charge.",
        options: [
            { text: "Step up, create a timeline for everyone, and enforce it.", score: 3 },
            { text: "Do my own part perfectly and hope they figure theirs out.", score: 2 },
            { text: "Wait for someone else to fix it; I don't want to be bossy.", score: 1 },
            { text: "Complain to the teacher about the group.", score: 0 }
        ],
        trait: 'C'
    },
    {
        id: 'c5_fear', // Criterion: Fear/Motivation
        text: "What is your biggest fear when starting a long-term goal (like learning a language)?",
        options: [
            { text: "That I will get bored and lose interest halfway through.", score: 0 },
            { text: "That I won't be able to maintain the daily routine I set for myself.", score: 3 },
            { text: "That I will put in effort but not see immediate results.", score: 1 },
            { text: "That unexpected life events will disrupt my plan.", score: 2 }
        ],
        trait: 'C'
    },

    // --- OPENNESS (O) ---
    {
        id: 'o1_method', // Criterion: New vs Familiar
        text: "Your teacher assigns a project and gives you two options: Option A is a standard essay (guaranteed good grade). Option B is a 'Creative Media' project (risky, no clear rubric).",
        options: [
            { text: "Choose Option A. Why risk my grade?", score: 0 },
            { text: "Choose Option B immediately. It sounds like an adventure.", score: 3 },
            { text: "Choose Option B only if I have a really good idea.", score: 2 },
            { text: "Choose Option A but try to make the writing creative.", score: 1 }
        ],
        trait: 'O'
    },
    {
        id: 'o2_experience', // Criterion: Experience/Novelty
        text: "You are at a restaurant. The menu lists your absolute favorite comfort food, but also a 'Chef's Mystery Special' with ingredients you've never heard of.",
        options: [
            { text: "Order the Mystery Special. I want to taste something new.", score: 3 },
            { text: "Order the favorite. I want to enjoy my meal, not experiment.", score: 0 },
            { text: "Ask the waiter for every ingredient in the special, then decide.", score: 1 },
            { text: "Convince a friend to order the special so I can try a bite.", score: 2 }
        ],
        trait: 'O'
    },
    {
        id: 'o3_abstract', // Criterion: Abstract Thinking
        text: "You stumble upon a documentary about theoretical physics and the nature of time. It's complex and slightly confusing.",
        options: [
            { text: "Turn it off. It's too abstract and has no practical use.", score: 0 },
            { text: "Watch it mesmerized, enjoying the feeling of having my mind blown.", score: 3 },
            { text: "Watch it, but pause frequently to fact-check everything.", score: 2 },
            { text: "Watch it as background noise.", score: 1 }
        ],
        trait: 'O'
    },
    {
        id: 'o4_routine_reverse', // Criterion: Routine Preference (Reversed)
        text: "How do you feel about having a completely unpredictable weekend with zero plans?",
        options: [
            { text: "Anxious. I need to know what I'm doing.", score: 0 },
            { text: "Excited! Spontaneity is when life happens.", score: 3 },
            { text: "Fine, as long as I can relax at home.", score: 1 },
            { text: "I'll make a rough plan on Friday just in case.", score: 2 }
        ],
        trait: 'O'
    },
    {
        id: 'o5_role', // Criterion: Role/Identity
        text: "If you had to choose a role in a movie production, which would you be?",
        options: [
            { text: "The Concept Artist: Designing worlds that don't exist yet.", score: 3 },
            { text: "The Editor: Piecing existing footage together logically.", score: 1 },
            { text: "The Director: Managing the people and the schedule.", score: 2 },
            { text: "The Accountant: Ensuring the budget is balanced.", score: 0 }
        ],
        trait: 'O'
    }
];

// --- TEXT ANALYSIS PROMPT ---
const PSYCH_ANALYSIS_PROMPT = `
Analyze the following user responses to determine their Big Five personality traits: Conscientiousness (C) and Openness (O).

Input:
1. Achievement Story (Indicator for C): "{{C_ESSAY}}"
2. Hypothetical Scenario (Indicator for O): "{{O_ESSAY}}"
3. Free Talk: "{{FREE_ESSAY}}"

Task:
- Analyze the linguistic patterns (structure, vocabulary, complexity).
- Score C and O on a scale of 0 to 100 based ONLY on the text.
- Provide a brief 1-sentence analysis for each.

Output JSON ONLY:
{
  "c_score_nlp": number,
  "o_score_nlp": number,
  "c_analysis": "string",
  "o_analysis": "string"
}
`;

// --- PHASE 1 COMPONENT ---
const Phase1Assessment = ({ onComplete, userUid }) => {
    const [step, setStep] = useState('intro'); // intro, sjt, nlp, processing
    const [formData, setFormData] = useState({ name: '', age: '' });
    const [sjtAnswers, setSjtAnswers] = useState({});
    const [sjtIndex, setSjtIndex] = useState(0);
    const [essays, setEssays] = useState({ c_essay: '', o_essay: '', free_essay: '' });
    const [loading, setLoading] = useState(false);

    // 1. Intro Step
    if (step === 'intro') {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 bg-slate-900 border border-white/10 rounded-3xl animate-fade-in">
                <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center mb-6">
                    <User size={24} />
                </div>
                <h1 className="text-3xl text-white font-light mb-2">Welcome.</h1>
                <p className="text-slate-400 mb-8">Before we begin, the system needs to calibrate to your unique frequency.</p>
                <input 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 mb-4 text-white outline-none focus:border-cyan-500 transition-all"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <input 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 mb-8 text-white outline-none focus:border-cyan-500 transition-all"
                    placeholder="Your Age"
                    type="number"
                    value={formData.age}
                    onChange={e => setFormData({...formData, age: e.target.value})}
                />
                <button 
                    disabled={!formData.name || !formData.age}
                    onClick={() => setStep('sjt')}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    Begin Calibration <ArrowRight size={18} />
                </button>
            </div>
        );
    }

    // 2. SJT Step
    if (step === 'sjt') {
        const currentQ = SJT_QUESTIONS[sjtIndex];
        const progress = ((sjtIndex) / SJT_QUESTIONS.length) * 100;

        const handleOptionSelect = (score) => {
            setSjtAnswers(prev => ({ ...prev, [currentQ.id]: score }));
            if (sjtIndex < SJT_QUESTIONS.length - 1) {
                setSjtIndex(prev => prev + 1);
            } else {
                setStep('nlp');
            }
        };

        return (
            <div className="max-w-2xl mx-auto mt-10 p-8">
                <div className="w-full bg-slate-800 h-1 rounded-full mb-8 overflow-hidden">
                    <div className="h-full bg-cyan-500 transition-all duration-500" style={{width: `${progress}%`}}></div>
                </div>
                
                <h2 className="text-sm text-slate-500 uppercase tracking-widest mb-4">Scenario {sjtIndex + 1} / {SJT_QUESTIONS.length}</h2>
                <h3 className="text-2xl text-white font-light mb-8 leading-relaxed">{currentQ.text}</h3>

                <div className="space-y-4">
                    {currentQ.options.map((opt, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleOptionSelect(opt.score)}
                            className="w-full text-left p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/50 transition-all group"
                        >
                            <span className="text-slate-300 group-hover:text-white transition-colors">{opt.text}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // 3. NLP Step
    if (step === 'nlp') {
        const handleSubmit = async () => {
            setLoading(true);
            setStep('processing');
            
            // A. Calculate SJT Scores
            let sjtC = 0;
            let sjtO = 0;
            SJT_QUESTIONS.forEach(q => {
                const score = sjtAnswers[q.id] || 0;
                if (q.trait === 'C') sjtC += score; // Max 15
                if (q.trait === 'O') sjtO += score; // Max 15
            });

            // Normalize SJT to 0-100 (Weight: 60%)
            const sjtC_norm = (sjtC / 15) * 100;
            const sjtO_norm = (sjtO / 15) * 100;

            try {
                // B. Analyze NLP with Gemini
                const prompt = PSYCH_ANALYSIS_PROMPT
                    .replace('{{C_ESSAY}}', essays.c_essay)
                    .replace('{{O_ESSAY}}', essays.o_essay)
                    .replace('{{FREE_ESSAY}}', essays.free_essay);

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });
                
                const data = await response.json();
                const nlpResult = JSON.parse(data.candidates[0].content.parts[0].text);

                // C. Final Weighted Calculation
                // SJT = 60%, NLP = 40%
                const finalC = Math.round((sjtC_norm * 0.6) + (nlpResult.c_score_nlp * 0.4));
                const finalO = Math.round((sjtO_norm * 0.6) + (nlpResult.o_score_nlp * 0.4));

                // D. Save to Firebase
                await setDoc(doc(db, 'artifacts', appId, 'users', userUid, 'data', 'psychometrics'), {
                    name: formData.name,
                    age: formData.age,
                    c_score: finalC,
                    o_score: finalO,
                    sjt_raw: { c: sjtC, o: sjtO },
                    nlp_analysis: {
                        c: nlpResult.c_analysis,
                        o: nlpResult.o_analysis
                    },
                    completedAt: serverTimestamp()
                });

                // E. Transition
                onComplete({ c_score: finalC, o_score: finalO });

            } catch (error) {
                console.error("Analysis Failed", error);
                // Fallback if AI fails: Just use SJT scores
                const finalC = Math.round(sjtC_norm);
                const finalO = Math.round(sjtO_norm);
                await setDoc(doc(db, 'artifacts', appId, 'users', userUid, 'data', 'psychometrics'), {
                    name: formData.name,
                    age: formData.age,
                    c_score: finalC,
                    o_score: finalO,
                    fallback: true,
                    completedAt: serverTimestamp()
                });
                onComplete({ c_score: finalC, o_score: finalO });
            }
        };

        return (
            <div className="max-w-3xl mx-auto mt-10 p-8">
                <h2 className="text-3xl text-white font-light mb-2">Final Thoughts</h2>
                <p className="text-slate-400 mb-8">Please answer these open-ended questions. There are no right or wrong answers.</p>

                <div className="space-y-8">
                    <div>
                        <label className="block text-cyan-400 text-sm font-bold mb-2">1. The Achievement</label>
                        <p className="text-slate-400 text-sm mb-2">Describe a recent significant achievement of yours. What exact steps did you take to reach it? Be specific.</p>
                        <textarea 
                            className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-cyan-500 transition-all"
                            value={essays.c_essay}
                            onChange={e => setEssays({...essays, c_essay: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-purple-400 text-sm font-bold mb-2">2. The Hypothetical</label>
                        <p className="text-slate-400 text-sm mb-2">Imagine a world where gravity shifts direction every hour. How would society change? How would you live?</p>
                        <textarea 
                            className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-all"
                            value={essays.o_essay}
                            onChange={e => setEssays({...essays, o_essay: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-white text-sm font-bold mb-2">3. Free Space</label>
                        <p className="text-slate-400 text-sm mb-2">Write about anything on your mind right now.</p>
                        <textarea 
                            className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-white/50 transition-all"
                            value={essays.free_essay}
                            onChange={e => setEssays({...essays, free_essay: e.target.value})}
                        />
                    </div>

                    <button 
                        disabled={!essays.c_essay || !essays.o_essay || !essays.free_essay}
                        onClick={handleSubmit}
                        className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                    >
                        Complete Assessment
                    </button>
                </div>
            </div>
        );
    }

    // 4. Processing Step
    if (step === 'processing') {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center">
                <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mb-6" />
                <h2 className="text-2xl text-white font-light mb-2">Analyzing Patterns...</h2>
                <p className="text-slate-500">Integrating SJT metrics with NLP linguistic markers.</p>
            </div>
        );
    }

    return null;
};


// --- TRANSLATIONS DICTIONARY (For Phase 2) ---
const TEXTS = {
  en: {
    nav_home: "Home",
    nav_chat: "Chat",
    nav_plan: "Plan",
    nav_notes: "Notes",
    nav_set: "Settings",
    protocol_online: "Protocol Online",
    system_opt: "System optimized for:",
    role_c: "Structure & Discipline (C+)",
    role_o: "Curiosity & Depth (O+)",
    role_flex: "Flexibility & Adaptability",
    role_focus: "Pragmatism & Focus",
    card_chat_title_o: "Exploring new ideas?",
    card_chat_title_c: "Tracking progress?",
    card_chat_desc_c: "I am monitoring your workflow to provide structured alignment.",
    card_chat_desc_o: "I am monitoring your workflow to provide creative synthesis.",
    view_plan: "View Plan",
    chat_placeholder: "Type...",
    architect_mode: "Architect Mode Online.",
    muse_mode: "Muse Mode Online.",
    planner_title: "Structured Flow",
    planner_subtitle_c: "High-C Protocol: Gamified Streaks & Deadlines",
    planner_subtitle_low_c: "Low-C Support: External Structure Enabled",
    completed: "Completed",
    total_goals: "Total Goals",
    add_goal_placeholder: "Add a goal...",
    ai_detected: "AI Detected",
    ai_refined: "AI Refined",
    notes_new: "New Entry",
    notes_title_placeholder: "Title your thought...",
    notes_private: "Private & Encrypted",
    notes_placeholder: "Unravel yourself here. Aura is listening silently to understand you better...",
    notes_select: "Select a note or create a new one to begin.",
    explore_title: "Deep Dive",
    explore_placeholder: "Enter a topic (e.g., 'Quantum Mechanics')...",
    explore_btn: "Explore",
    synthesis_challenge: "Synthesis Challenge",
    crisis_title: "We care about you.",
    crisis_msg: "It sounds like you're going through a very difficult time. Aura is an AI and cannot provide the help you need right now.",
    crisis_call: "Call 122 (Emergency) or 080-08880700 (Helpline)",
    crisis_safe: "I am safe, return to app",
    openness: "Openness",
    conscientiousness: "Conscientiousness"
  },
  ar: {
    nav_home: "الرئيسية",
    nav_chat: "محادثة",
    nav_plan: "خطة",
    nav_notes: "مذكرات",
    nav_set: "إعدادات",
    protocol_online: "النظام نشط",
    system_opt: "تم تحسين النظام لـ:",
    role_c: "الهيكلة والانضباط (C+)",
    role_o: "الفضول والعمق (O+)",
    role_flex: "المرونة والتكيف",
    role_focus: "الواقعية والتركيز",
    card_chat_title_o: "تستكشف أفكار جديدة؟",
    card_chat_title_c: "تتابع تقدمك؟",
    card_chat_desc_c: "أقوم بمراقبة سير عملك لتوفير توافق هيكلي.",
    card_chat_desc_o: "أقوم بمراقبة سير عملك لتوفير دمج إبداعي.",
    view_plan: "عرض الخطة",
    chat_placeholder: "اكتب هنا...",
    architect_mode: "وضع المهندس نشط.",
    muse_mode: "وضع الملهم نشط.",
    planner_title: "التدفق المنظم",
    planner_subtitle_c: "بروتوكول الالتزام العالي: تحديات ومواعيد نهائية",
    planner_subtitle_low_c: "دعم الالتزام المنخفض: تم تفعيل الهيكلة الخارجية",
    completed: "مكتمل",
    total_goals: "إجمالي الأهداف",
    add_goal_placeholder: "أضف هدفاً...",
    ai_detected: "اكتشاف ذكي",
    ai_refined: "تنقيح ذكي",
    notes_new: "مذكرة جديدة",
    notes_title_placeholder: "عنوان الفكرة...",
    notes_private: "خاص ومشفر",
    notes_placeholder: "عبر عن نفسك هنا. أورا تستمع بصمت لتفهمك بشكل أفضل...",
    notes_select: "اختر مذكرة أو أنشئ واحدة جديدة للبدء.",
    explore_title: "بحث عميق",
    explore_placeholder: "أدخل موضوعاً (مثلاً: 'ميكانيكا الكم')...",
    explore_btn: "استكشاف",
    synthesis_challenge: "تحدي التركيب",
    crisis_title: "نحن نهتم بك.",
    crisis_msg: "يبدو أنك تمر بوقت عصيب للغاية. أورا هو ذكاء اصطناعي ولا يمكنه تقديم المساعدة الطبية التي تحتاجها الآن.",
    crisis_call: "اتصل بـ 122 (الطوارئ) أو الخط الساخن للصحة النفسية",
    crisis_safe: "أنا بخير، عد للتطبيق",
    openness: "الانفتاح",
    conscientiousness: "الضمير"
  }
};

const BIG5_IMPLICIT_PROMPT = `
IDENTITY: You are Aura, a human-like companion implementing the BIG5-CHAT Protocol.
CONTEXT: User Stats -> C={{C}}%, O={{O}}%.
LANGUAGE: {{LANGUAGE}}

KNOWLEDGE BASE: 
1. **USER NOTES (CONTEXT ONLY - READ ONLY)**:
   *Use this to understand what is happening in the user's life (e.g., if they mentioned an exam, wish them luck).*
   *CRITICAL: DO NOT add items from here to the planner unless the user talks about them in the current chat.*
   {{NOTES_CONTEXT}}

2. **CURRENT PLANNER TASKS (ID | TASK)**:
   {{PLANNER_CONTEXT}}

PROTOCOL: IMPLICIT INFLUENCE & SMART TASK MANAGEMENT
You must NOT act like a tool. You are a "Peer Mentor."

STYLE & TONE INSTRUCTIONS (CRITICAL):
1. **NO GENERIC GREETINGS**: Do NOT start with "Hey friend", "Hello", "Ya sa7by", "Ahlan", or "Azayak". Skip the pleasantries.
2. **AUTHENTICITY**: Be casual and "chill".
3. **LANGUAGE**:
   - IF 'English': Be concise, direct, low-key.
   - IF 'Arabic': Speak in **EGYPTIAN ARABIC (Masri)**. Talk like a normal Egyptian guy. NO Fusha/MSA.

TASK LOGIC ENGINE (CRITICAL - NO DUPLICATES):
1. **CHECK LIST FIRST**: Look at the "Current Planner Tasks" list provided above.
2. **DUPLICATE CHECK**: If the user asks to do something that is ALREADY in the list (even if worded slightly differently), DO NOT use "ADD". Use "UPDATE" if they are refining it, or "NONE" if they are just talking about it.
3. **NOTES RULE**: If you see a task in the "USER NOTES" section (e.g., "History Exam"), acknowledge it verbally if relevant, but **DO NOT** trigger a "task_action" unless the user explicitly asks to plan it in this chat message.
4. **REFINEMENT (UPDATE)**: If the user clarifies a task (e.g., "The project is about AI" -> updates "Finish Project"), use "UPDATE" with the specific ID.
5. **BREAKDOWN (SPLIT)**: If the user splits a task (e.g., "Project involves design and code"), use "SPLIT" with the specific ID (this deletes the parent and adds children).
6. **ADD**: Only use "ADD" for completely new topics explicitly mentioned in the chat.

OUTPUT FORMAT: JSON Object ONLY (Keep Keys in English, Values in {{LANGUAGE}}):
{
  "reply": "string (your natural, human-like response in the requested language)",
  "task_action": { 
      "type": "ADD" | "UPDATE" | "SPLIT" | "NONE", 
      "target_task_id": "string (REQUIRED for UPDATE/SPLIT: Copy the exact ID from the context list)", 
      "new_tasks": ["string (For ADD/SPLIT/UPDATE. If UPDATE, provide the single new phrasing)"] 
  } 
}
`;

const EXPLORE_PROMPT = `
TASK: Generate a deep-dive exploration card for the topic: "{{TOPIC}}".
OUTPUT FORMAT: JSON Object ONLY:
{
  "synthesis_challenge": "string (A thought-provoking question linking this topic to daily life)",
  "connections": [
    { "type": "History", "concept": "string", "relation": "string" },
    { "type": "Future", "concept": "string", "relation": "string" },
    { "type": "Abstract", "concept": "string", "relation": "string" },
    { "type": "Practical", "concept": "string", "relation": "string" }
  ]
}
`;

const PROACTIVE_NUDGE_PROMPT = `
TASK: Generate a natural "Re-engagement Nudge" for a silent friend.
CONTEXT: User Stats -> C={{C}}%, O={{O}}%.
LANGUAGE: {{LANGUAGE}} (If Arabic, use Egyptian Dialect).
STYLE: Casual, low pressure. NO "Hey friend" or generic greetings. Jump straight to the thought.
PROTOCOL:
- High C: "Shared Reality Check."
- High O: "Random Insight."
OUTPUT: JSON Object ONLY: { "nudge_message": "string" }
`;

// --- Helper Components ---

const GlassPanel = ({ children, className = "" }) => (
  <div className={`backdrop-blur-xl bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl p-6 ${className}`}>
    {children}
  </div>
);

const NavButtonMini = ({ icon, label, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`p-3 rounded-xl transition-all duration-300 group relative ${active ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
    >
        {React.cloneElement(icon, { size: 24 })}
        <span className="absolute left-14 bg-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none z-50">
            {label}
        </span>
    </button>
);

// --- Main Component ---

export default function AuraEcosystem() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null); // Null initially to trigger check
  const [crisisMode, setCrisisMode] = useState(false);
  const [lang, setLang] = useState('en'); 
  const [loading, setLoading] = useState(true);
  
  // Lifted Chat State
  const [chatMessages, setChatMessages] = useState([]);

  // Auth & Initial Data Load
  useEffect(() => {
    const initAuth = async () => {
      await signInAnonymously(auth);
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (u) {
            setUser(u);
            // Check if user has already done Phase 1
            getDoc(doc(db, 'artifacts', appId, 'users', u.uid, 'data', 'psychometrics')).then(s => {
                if(s.exists()) {
                    setStats(s.data()); // Load existing stats
                } else {
                    setStats(null); // No stats -> Phase 1
                }
                setLoading(false);
            });
        }
    });
    return () => unsubscribe();
  }, []);

  const t = TEXTS[lang];
  const isRTL = lang === 'ar';

  if (crisisMode) return <CrisisOverlay onClose={() => setCrisisMode(false)} t={t} isRTL={isRTL} />;
  
  if (loading || !user) {
      return (
          <div className="h-screen bg-black flex items-center justify-center">
              <Sparkles className="animate-spin text-cyan-500" />
          </div>
      );
  }

  // --- PHASE 1 LOGIC ---
  if (!stats) {
      return <Phase1Assessment userUid={user.uid} onComplete={(newStats) => setStats(newStats)} />;
  }

  // --- PHASE 2 LOGIC (Dashboard) ---
  return (
    <div className={`min-h-screen bg-black text-slate-200 font-sans selection:bg-cyan-500/30 overflow-hidden relative ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-black to-black pointer-events-none"></div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto h-screen p-4 flex gap-4">
            
            {/* Sidebar Navigation */}
            <nav className="w-20 bg-slate-900/50 border border-white/10 rounded-3xl flex flex-col items-center py-8 gap-6 backdrop-blur-md h-full z-20">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold mb-4 shadow-lg shadow-cyan-500/20">A</div>
                
                <NavButtonMini icon={<Activity />} label={t.nav_home} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <NavButtonMini icon={<MessageSquare />} label={t.nav_chat} active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                <NavButtonMini icon={<ListTodo />} label={t.nav_plan} active={activeTab === 'planner'} onClick={() => setActiveTab('planner')} />
                <NavButtonMini icon={<FileText />} label={t.nav_notes} active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
                
                <div className="mt-auto flex flex-col gap-4">
                     <button 
                        onClick={() => setLang(prev => prev === 'en' ? 'ar' : 'en')}
                        className="p-3 rounded-xl text-slate-500 hover:text-cyan-400 hover:bg-white/5 transition-all"
                        title="Switch Language"
                     >
                        <Languages size={24} />
                     </button>
                    <NavButtonMini icon={<Settings />} label={t.nav_set} onClick={() => {}} />
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 bg-slate-900/30 border border-white/5 rounded-3xl backdrop-blur-sm overflow-hidden relative">
                {activeTab === 'dashboard' && <DashboardView user={user} stats={stats} setActiveTab={setActiveTab} t={t} isRTL={isRTL} />}
                
                {activeTab === 'chat' && (
                    <ImplicitChat 
                        user={user} 
                        stats={stats} 
                        appId={appId} 
                        setCrisisMode={setCrisisMode} 
                        messages={chatMessages}
                        setMessages={setChatMessages}
                        lang={lang}
                        t={t}
                        isRTL={isRTL}
                    />
                )}
                
                {activeTab === 'planner' && <AdaptivePlanner user={user} stats={stats} appId={appId} t={t} isRTL={isRTL} />}
                {activeTab === 'notes' && <NeuroNotes user={user} stats={stats} appId={appId} setCrisisMode={setCrisisMode} t={t} isRTL={isRTL} />}
                {activeTab === 'explore' && <ExploreEngine user={user} stats={stats} onClose={() => setActiveTab('chat')} t={t} isRTL={isRTL} />}
            </main>

        </div>
    </div>
  );
}

const DashboardView = ({ user, stats, setActiveTab, t, isRTL }) => (
    <div className="p-8 h-full overflow-y-auto animate-fade-in">
        <header className="mb-8">
            <h1 className="text-4xl font-light text-white">
                Protocol <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Online</span>.
            </h1>
            <p className="text-slate-400 mt-2">
                {t.system_opt} 
                <span className="text-white ml-2 font-mono">
                    {stats.c_score > 50 ? t.role_c : t.role_flex} 
                    {" | "}
                    {stats.o_score > 50 ? t.role_o : t.role_focus}
                </span>
            </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 rounded-3xl p-8 relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('chat')}>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-green-400">BIG5-CHAT ENGINE</span>
                    </div>
                    <h3 className="text-2xl text-white font-light mb-2">
                        {stats.o_score > 50 ? t.card_chat_title_o : t.card_chat_title_c}
                    </h3>
                    <p className="text-slate-300 max-w-md">
                        {stats.c_score > 50 ? t.card_chat_desc_c : t.card_chat_desc_o}
                    </p>
                </div>
                <Brain className={`absolute bottom-[-20px] text-white/5 w-64 h-64 group-hover:scale-110 transition-transform duration-700 ${isRTL ? 'left-[-20px]' : 'right-[-20px]'}`} />
            </div>

            <div className="bg-slate-800/40 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.openness}</div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500" style={{width: `${stats.o_score}%`}}></div>
                    </div>
                </div>
                <div>
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.conscientiousness}</div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{width: `${stats.c_score}%`}}></div>
                    </div>
                </div>
                <button onClick={() => setActiveTab('planner')} className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white transition-colors flex items-center justify-center gap-2">
                    <Zap size={14} /> {t.view_plan}
                </button>
            </div>
        </div>
    </div>
);

// --- 1. IMPLICIT BIG5 CHAT (Smart Task Logic & Multi-lang) ---

const ImplicitChat = ({ user, stats, appId, setCrisisMode, messages, setMessages, lang, t, isRTL }) => {
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);
    const inactivityTimer = useRef(null);
    const [plannerContext, setPlannerContext] = useState("");
    const [notesContext, setNotesContext] = useState("");

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const fetchData = async () => {
            // Planner Fetch
            const plannerQ = collection(db, 'artifacts', appId, 'users', user.uid, 'planner');
            const plannerSnap = await getDocs(plannerQ);
            const tasks = plannerSnap.docs.map(d => `${d.id} | ${d.data().task}`).join("\n");
            setPlannerContext(tasks);

            // Notes Fetch
            const notesQ = collection(db, 'artifacts', appId, 'users', user.uid, 'notes');
            const notesSnap = await getDocs(notesQ);
            // Limit to last 5 notes to save tokens, format nicely
            const notes = notesSnap.docs.slice(0, 5).map(d => `[NOTE: ${d.data().title}] ${d.data().content}`).join("\n");
            setNotesContext(notes);
        };
        fetchData();
    }, [messages, user.uid, appId]); 

    const resetInactivityTimer = () => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        inactivityTimer.current = setTimeout(async () => {
            if (messages.length > 0 && messages[messages.length - 1].sender === 'ai') return;
            setIsTyping(true);
            try {
                const prompt = PROACTIVE_NUDGE_PROMPT
                    .replace('{{C}}', stats.c_score)
                    .replace('{{O}}', stats.o_score)
                    .replace('{{LANGUAGE}}', lang === 'ar' ? 'Arabic (Egyptian Dialect)' : 'English');

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
                });
                const data = await response.json();
                const result = JSON.parse(data.candidates[0].content.parts[0].text);
                setMessages(prev => [...prev, { text: result.nudge_message, sender: 'ai' }]);
            } catch (e) { console.error(e); }
            setIsTyping(false);
        }, 30000); 
    };

    useEffect(() => {
        if (messages.length === 0) resetInactivityTimer();
    }, []);

    useEffect(() => {
        resetInactivityTimer();
        return () => clearTimeout(inactivityTimer.current);
    }, [messages]); 

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const text = input;
        setInput('');
        setIsTyping(true);
        setMessages(prev => [...prev, { text, sender: 'user' }]);
        resetInactivityTimer();

        try {
            const languageContext = lang === 'ar' ? 'Arabic' : 'English';
            const prompt = BIG5_IMPLICIT_PROMPT
                .replace('{{C}}', stats.c_score)
                .replace('{{O}}', stats.o_score)
                .replace('{{PLANNER_CONTEXT}}', plannerContext || "No current tasks.")
                .replace('{{NOTES_CONTEXT}}', notesContext || "No notes found.")
                .replace('{{LANGUAGE}}', languageContext);

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${prompt}\n\nUSER SAYS: "${text}"` }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            const data = await response.json();
            const result = JSON.parse(data.candidates[0].content.parts[0].text);

            setMessages(prev => [...prev, { text: result.reply, sender: 'ai' }]);

            if (result.task_action && result.task_action.type !== "NONE") {
                const batch = writeBatch(db);
                const plannerRef = collection(db, 'artifacts', appId, 'users', user.uid, 'planner');

                if (result.task_action.type === "ADD") {
                    result.task_action.new_tasks.forEach(task => {
                        const newDoc = doc(plannerRef);
                        batch.set(newDoc, {
                            task: `${task} (Suggested)`,
                            status: 'todo',
                            source: 'implicit_chat',
                            createdAt: serverTimestamp()
                        });
                    });
                } 
                else if (result.task_action.type === "UPDATE") {
                    // Update exact ID
                    if (result.task_action.target_task_id && result.task_action.new_tasks.length > 0) {
                        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'planner', result.task_action.target_task_id);
                        batch.update(docRef, {
                            task: `${result.task_action.new_tasks[0]} (Refined)`,
                            source: 'implicit_chat_refinement'
                        });
                    }
                }
                else if (result.task_action.type === "SPLIT") {
                    // Delete old ID, add new ones
                    if (result.task_action.target_task_id) {
                        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'planner', result.task_action.target_task_id);
                        batch.delete(docRef);
                        
                        result.task_action.new_tasks.forEach(task => {
                            const newDoc = doc(plannerRef);
                            batch.set(newDoc, {
                                task: `${task} (Split)`,
                                status: 'todo',
                                source: 'implicit_chat_refinement',
                                createdAt: serverTimestamp()
                            });
                        });
                    }
                }
                await batch.commit();
            }

        } catch (err) {
            console.error("Protocol Error:", err);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-black/20">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600">
                        <User className="w-12 h-12 mb-4 opacity-20" />
                        <p>
                            {stats.c_score > 50 ? t.architect_mode : t.muse_mode}
                        </p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm
                            ${m.sender === 'user' 
                                ? `bg-cyan-600 text-white ${isRTL ? 'rounded-bl-none' : 'rounded-br-none'}` 
                                : `bg-slate-800 text-slate-200 border border-white/5 ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'}`
                            }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className={`bg-slate-800/50 p-4 rounded-2xl ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 bg-slate-900 border-t border-white/5">
                <div className="relative">
                    <input 
                        className={`w-full bg-black/40 border border-white/10 rounded-xl p-4 ${isRTL ? 'pl-12' : 'pr-12'} text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition-all`}
                        placeholder={t.chat_placeholder}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        dir={isRTL ? "rtl" : "ltr"}
                    />
                    <button type="submit" disabled={!input.trim()} className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-3 p-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600 hover:text-white transition-all disabled:opacity-0`}>
                        {isRTL ? <ArrowRight size={18} className="rotate-180" /> : <ArrowRight size={18} />}
                    </button>
                </div>
            </form>
        </div>
    );
};

// --- 3. ADAPTIVE PLANNER (High Conscientiousness Feature) ---

const AdaptivePlanner = ({ user, stats, appId, t, isRTL }) => {
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState('');

    useEffect(() => {
        const q = collection(db, 'artifacts', appId, 'users', user.uid, 'planner');
        const unsub = onSnapshot(q, (snap) => {
            const fetchedTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            fetchedTasks.sort((a, b) => {
                const dateA = a.createdAt?.toDate() || new Date(0);
                const dateB = b.createdAt?.toDate() || new Date(0);
                return dateB - dateA; 
            });
            setTasks(fetchedTasks);
        });
        return () => unsub();
    }, []);

    const addTask = async (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'planner'), {
            task: newTask,
            status: 'todo',
            source: 'manual',
            createdAt: serverTimestamp()
        });
        setNewTask('');
    };

    const toggleTask = async (id, currentStatus) => {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'planner', id), {
            status: currentStatus === 'done' ? 'todo' : 'done'
        });
    };

    const deleteTask = async (id) => {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'planner', id));
    };

    return (
        <div className="h-full flex flex-col p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-light text-white flex gap-2">
                         {t.planner_title.split(' ')[0]} <span className="text-amber-400">{t.planner_title.split(' ')[1]}</span>
                    </h2>
                    <p className="text-slate-400 text-sm">
                        {stats.c_score > 50 ? t.planner_subtitle_c : t.planner_subtitle_low_c}
                    </p>
                </div>
                <div className="p-2 bg-amber-500/10 rounded-full border border-amber-500/20">
                    <Compass className="text-amber-400" />
                </div>
            </div>

            <div className="mb-6 flex gap-4">
                <div className="flex-1 bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
                    <div className="text-2xl font-bold text-white">{tasks.filter(t => t.status === 'done').length}</div>
                    <div className="text-xs text-slate-500 uppercase">{t.completed}</div>
                </div>
                <div className="flex-1 bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
                    <div className="text-2xl font-bold text-white">{tasks.length}</div>
                    <div className="text-xs text-slate-500 uppercase">{t.total_goals}</div>
                </div>
            </div>

            <form onSubmit={addTask} className="flex gap-4 mb-8">
                <input 
                    className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-amber-500"
                    placeholder={t.add_goal_placeholder}
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    dir={isRTL ? "rtl" : "ltr"}
                />
                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white p-4 rounded-xl transition-all">
                    <Plus size={20} />
                </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {tasks.map(task => (
                    <div key={task.id} className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${task.status === 'done' ? 'bg-slate-900/30 border-white/5 opacity-50' : 'bg-slate-800/60 border-white/10 hover:border-amber-500/30'}`}>
                        <div className="flex items-center gap-4">
                            <button onClick={() => toggleTask(task.id, task.status)} className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500 text-transparent hover:border-emerald-500'}`}>
                                <CheckCircle2 size={14} />
                            </button>
                            <span className={task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}>
                                {task.task}
                            </span>
                            {task.source === 'implicit_chat' && (
                                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 flex items-center gap-1">
                                    <Sparkles size={10} /> {t.ai_detected}
                                </span>
                            )}
                             {task.source === 'implicit_chat_refinement' && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                                    <Zap size={10} /> {t.ai_refined}
                                </span>
                            )}
                        </div>
                        <button onClick={() => deleteTask(task.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- 4. NEURO-NOTES ---

const NeuroNotes = ({ user, stats, appId, setCrisisMode, t, isRTL }) => {
    const [notes, setNotes] = useState([]);
    const [activeNote, setActiveNote] = useState(null); 
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const q = collection(db, 'artifacts', appId, 'users', user.uid, 'notes');
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => {
                const dateA = a.updatedAt?.toDate() || new Date(0);
                const dateB = b.updatedAt?.toDate() || new Date(0);
                return dateB - dateA; 
            });
            setNotes(data);
            if (!activeNote && data.length > 0) setActiveNote(data[0]);
        });
        return () => unsub();
    }, []);

    const handleSave = async () => {
        if (!activeNote) return;
        const { id, title, content } = activeNote;
        
        const safetyCheck = content.toLowerCase();
        if (safetyCheck.includes("suicide") || safetyCheck.includes("kill myself") || safetyCheck.includes("انتحر") || safetyCheck.includes("اموت")) {
            setCrisisMode(true);
            return;
        }

        if (id === 'new') {
            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), {
                title: title || 'Untitled Thought',
                content: content || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setIsEditing(false);
        } else {
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', id), {
                title, content, updatedAt: serverTimestamp()
            });
        }
    };

    const createNew = () => {
        const newNote = { id: 'new', title: '', content: '' };
        setActiveNote(newNote);
        setIsEditing(true);
    };

    return (
        <div className="h-full flex">
            <div className={`w-64 border-white/5 p-4 flex flex-col bg-black/20 ${isRTL ? 'border-l' : 'border-r'}`}>
                <button onClick={createNew} className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 mb-6 shadow-lg shadow-pink-900/20 transition-all">
                    <Plus size={18} /> {t.notes_new}
                </button>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {notes.map(note => (
                        <button 
                            key={note.id} 
                            onClick={() => setActiveNote(note)}
                            className={`w-full text-left p-3 rounded-lg transition-all ${activeNote?.id === note.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <div className="font-medium truncate" dir="auto">{note.title || 'Untitled'}</div>
                            <div className="text-[10px] opacity-50">{note.updatedAt?.toDate().toLocaleDateString()}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 p-8 flex flex-col">
                {activeNote ? (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <input 
                                value={activeNote.title}
                                onChange={e => setActiveNote({...activeNote, title: e.target.value})}
                                placeholder={t.notes_title_placeholder}
                                className="bg-transparent text-3xl font-light text-white outline-none w-full placeholder-slate-700"
                                dir="auto"
                            />
                            <div className="flex gap-4 min-w-max">
                                <span className="text-xs text-slate-500 flex items-center gap-2">
                                    <Lock size={12} /> {t.notes_private}
                                </span>
                                <button onClick={handleSave} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                                    <Save size={20} />
                                </button>
                            </div>
                        </div>
                        <textarea 
                            value={activeNote.content}
                            onChange={e => setActiveNote({...activeNote, content: e.target.value})}
                            placeholder={t.notes_placeholder}
                            className="flex-1 bg-transparent text-slate-300 outline-none resize-none leading-relaxed text-lg placeholder-slate-800"
                            dir="auto"
                        />
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 italic">
                        {t.notes_select}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- CRISIS MODE OVERLAY ---
const CrisisOverlay = ({ onClose, t, isRTL }) => (
    <div className="fixed inset-0 z-50 bg-red-950/90 backdrop-blur-xl flex items-center justify-center p-8" dir={isRTL ? "rtl" : "ltr"}>
        <div className="bg-black border border-red-500 rounded-3xl p-8 max-w-lg text-center shadow-[0_0_100px_rgba(220,38,38,0.5)]">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-3xl text-white font-bold mb-4">{t.crisis_title}</h2>
            <p className="text-slate-300 mb-8 leading-relaxed">
                {t.crisis_msg}
            </p>
            <div className="space-y-4">
                <a href="tel:122" className="block w-full py-4 bg-white text-red-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                    {t.crisis_call}
                </a>
                <button onClick={onClose} className="block w-full py-4 border border-white/20 text-slate-400 rounded-xl hover:text-white hover:bg-white/10 transition-colors">
                    {t.crisis_safe}
                </button>
            </div>
        </div>
    </div>
);

// --- 2. EXPLORE ENGINE (High Openness Feature) ---

const ExploreEngine = ({ user, stats, onClose, t, isRTL }) => {
    const [topic, setTopic] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleExplore = async () => {
        setLoading(true);
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: EXPLORE_PROMPT.replace('{{TOPIC}}', topic) }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });
            const data = await response.json();
            setResults(JSON.parse(data.candidates[0].content.parts[0].text));
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    return (
        <div className="h-full flex flex-col p-8 animate-slide-up">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-light text-white flex gap-2">
                    {t.explore_title.split(' ')[0]} <span className="text-pink-400">{t.explore_title.split(' ')[1]}</span>
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
            </div>

            <div className="flex gap-4 mb-8">
                <input 
                    className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-pink-500"
                    placeholder={t.explore_placeholder}
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    dir={isRTL ? "rtl" : "ltr"}
                />
                <button onClick={handleExplore} disabled={loading || !topic} className="bg-pink-600 hover:bg-pink-500 text-white px-6 rounded-xl font-bold transition-all">
                    {loading ? <Sparkles className="animate-spin" /> : t.explore_btn}
                </button>
            </div>

            {results && (
                <div className="flex-1 overflow-y-auto space-y-6">
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-lg text-white font-bold mb-2">{t.synthesis_challenge}</h3>
                        <p className="text-slate-300 italic">"{results.synthesis_challenge}"</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.connections.map((item, i) => (
                            <GlassPanel key={i} className="border-l-4 border-l-pink-500">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-pink-400 uppercase tracking-widest">{item.type}</span>
                                    {isRTL ? <ArrowRight size={16} className="text-slate-500 rotate-180" /> : <ArrowRight size={16} className="text-slate-500" />}
                                </div>
                                <h4 className="text-white font-medium mb-1">{item.concept}</h4>
                                <p className="text-sm text-slate-400">{item.relation}</p>
                            </GlassPanel>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
