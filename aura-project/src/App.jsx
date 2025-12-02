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

// --- FINAL CONFIGURATION (HARDCODED KEYS) ---

// 1. GEMINI KEY
const apiKey = "AIzaSyDMhhouiN5CmqHS16aT4XOS5TASubmW0lc"; 

// 2. FIREBASE CONFIG (Project: shit-a43ea)
const firebaseConfig = {
  apiKey: "AIzaSyCOgF_kEGTiUUC0qKnYxeCF7-WbhmEyq_c",
  authDomain: "shit-a43ea.firebaseapp.com",
  projectId: "shit-a43ea",
  storageBucket: "shit-a43ea.firebasestorage.app",
  messagingSenderId: "672307794328",
  appId: "1:672307794328:web:1991a78d1cc42681819bed"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'aura-production-v1';

// --- SJT DATA (PHASE 1 SCENARIOS) ---
// Based on the uploaded criteria: Detailed, Non-biased, Frustration-check, Diverse domains
const SJT_QUESTIONS = [
    // --- CONSCIENTIOUSNESS (C) ---
    {
        id: 'c1_study_stress', 
        text: "You have a massive final exam in 3 days. You planned to study Chapter 4 today, but you woke up feeling mentally exhausted and foggy.",
        options: [
            { text: "Push through the fog and stick to the schedule exactly as planned.", score: 3 }, 
            { text: "Modify the plan: study easier concepts today to keep momentum without burning out.", score: 2 }, 
            { text: "Take the day off to recover; I'll cram double tomorrow.", score: 0 }, 
            { text: "Wait until I feel 'inspired' or energetic to start.", score: 1 } 
        ],
        trait: 'C'
    },
    {
        id: 'c2_environment', 
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
        id: 'c3_frustration', 
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
        id: 'c4_interaction', 
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
        id: 'c5_fear',
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
        id: 'o1_method', 
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
        id: 'o2_experience', 
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
        id: 'o3_abstract', 
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
        id: 'o4_routine_reverse', 
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
        id: 'o5_role',
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
ROLE: You are an expert Psychometrician.
TASK: Score the user's "Conscientiousness" (C) and "Openness" (O) based ONLY on their essays.

ESSAYS:
1. Achievement (C indicator): "{{C_ESSAY}}"
2. Hypothetical (O indicator): "{{O_ESSAY}}"
3. Free Talk: "{{FREE_ESSAY}}"

RUBRIC:
- High C (80-100): Mentions specific plans, discipline, order, finishing tasks, structure.
- Low C (0-40): Mentions luck, chaos, procrastination, "winging it", dislike of rules.
- High O (80-100): Abstract ideas, creativity, curiosity, philosophical themes, novelty.
- Low O (0-40): Concrete thinking, preference for familiar, practical/routine focus.

OUTPUT JSON ONLY:
{
  "c_score_nlp": number (0-100),
  "o_score_nlp": number (0-100),
  "c_analysis": "string (max 15 words)",
  "o_analysis": "string (max 15 words)"
}
`;

// --- PHASE 1 COMPONENT ---
const Phase1Assessment = ({ onComplete, userUid }) => {
    const [step, setStep] = useState('intro'); 
    const [formData, setFormData] = useState({ name: '', age: '' });
    const [sjtAnswers, setSjtAnswers] = useState({});
    const [sjtIndex, setSjtIndex] = useState(0);
    const [essays, setEssays] = useState({ c_essay: '', o_essay: '', free_essay: '' });
    const [loading, setLoading] = useState(false);

    if (step === 'intro') {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 bg-slate-900 border border-white/10 rounded-3xl animate-fade-in">
                <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center mb-6">
                    <User size={24} />
                </div>
                <h1 className="text-3xl text-white font-light mb-2">Welcome.</h1>
                <p className="text-slate-400 mb-8">System calibration required.</p>
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
                    className="w-full bg-cyan-600 text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50"
                >
                    Start Calibration
                </button>
            </div>
        );
    }

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
                <h3 className="text-2xl text-white font-light mb-8 leading-relaxed">{currentQ.text}</h3>
                <div className="space-y-4">
                    {currentQ.options.map((opt, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleOptionSelect(opt.score)}
                            className="w-full text-left p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/50 transition-all"
                        >
                            <span className="text-slate-300">{opt.text}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (step === 'nlp') {
        const handleSubmit = async () => {
            setLoading(true);
            setStep('processing');
            
            let sjtC = 0;
            let sjtO = 0;
            SJT_QUESTIONS.forEach(q => {
                const score = sjtAnswers[q.id] || 0;
                if (q.trait === 'C') sjtC += score;
                if (q.trait === 'O') sjtO += score;
            });

            // Normalize SJT (Max 15 points per trait)
            const sjtC_norm = (sjtC / 15) * 100;
            const sjtO_norm = (sjtO / 15) * 100;

            try {
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
                let nlpResult = { c_score_nlp: 50, o_score_nlp: 50, c_analysis: "Standard analysis", o_analysis: "Standard analysis" };
                
                if (data.candidates && data.candidates[0].content) {
                     nlpResult = JSON.parse(data.candidates[0].content.parts[0].text);
                }

                // Weighted Score: SJT 70% (More reliable), NLP 30%
                const finalC = Math.round((sjtC_norm * 0.7) + (nlpResult.c_score_nlp * 0.3));
                const finalO = Math.round((sjtO_norm * 0.7) + (nlpResult.o_score_nlp * 0.3));

                await setDoc(doc(db, 'artifacts', appId, 'users', userUid, 'data', 'psychometrics'), {
                    name: formData.name,
                    age: formData.age,
                    c_score: finalC,
                    o_score: finalO,
                    sjt_raw: { c: sjtC, o: sjtO },
                    nlp_analysis: { c: nlpResult.c_analysis, o: nlpResult.o_analysis },
                    completedAt: serverTimestamp()
                });

                onComplete({ c_score: finalC, o_score: finalO });

            } catch (error) {
                console.error("Analysis Error:", error);
                // Fallback: Use only SJT if AI fails
                const finalC = Math.round(sjtC_norm);
                const finalO = Math.round(sjtO_norm);
                await setDoc(doc(db, 'artifacts', appId, 'users', userUid, 'data', 'psychometrics'), {
                    name: formData.name,
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
                <h2 className="text-3xl text-white font-light mb-8">Final Step: Expression</h2>
                <div className="space-y-8">
                    <div>
                        <label className="block text-cyan-400 text-sm font-bold mb-2">1. Achievement (Be Specific)</label>
                        <textarea className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none" 
                            value={essays.c_essay} onChange={e => setEssays({...essays, c_essay: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-purple-400 text-sm font-bold mb-2">2. Hypothetical (Be Creative)</label>
                        <textarea className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none" 
                            value={essays.o_essay} onChange={e => setEssays({...essays, o_essay: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-white text-sm font-bold mb-2">3. Free Space</label>
                        <textarea className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none" 
                            value={essays.free_essay} onChange={e => setEssays({...essays, free_essay: e.target.value})} />
                    </div>
                    <button disabled={!essays.c_essay || !essays.o_essay} onClick={handleSubmit}
                        className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50">
                        Complete
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[60vh] flex flex-col items-center justify-center">
            <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mb-6" />
            <h2 className="text-2xl text-white font-light">Analyzing...</h2>
        </div>
    );
};

const TEXTS = {
  en: {
    nav_home: "Home", nav_chat: "Chat", nav_plan: "Plan", nav_notes: "Notes", nav_set: "Settings",
    system_opt: "System optimized for:", role_c: "Structure (C+)", role_o: "Depth (O+)",
    role_flex: "Flexibility", role_focus: "Focus", card_chat_title_o: "Explore Ideas",
    card_chat_title_c: "Track Progress", card_chat_desc_c: "Alignment mode active.",
    card_chat_desc_o: "Synthesis mode active.", view_plan: "View Plan", chat_placeholder: "Type...",
    architect_mode: "Architect Mode", muse_mode: "Muse Mode", planner_title: "Structured Flow",
    completed: "Done", total_goals: "Goals", add_goal_placeholder: "Add...", ai_detected: "AI Detected",
    ai_refined: "Refined", notes_new: "New Entry", notes_title_placeholder: "Title...",
    notes_private: "Encrypted", notes_placeholder: "Write here...", notes_select: "Select a note.",
    explore_title: "Deep Dive", explore_placeholder: "Topic...", explore_btn: "Explore",
    synthesis_challenge: "Challenge", crisis_title: "Support", crisis_msg: "Please seek professional help.",
    crisis_call: "Call 122", crisis_safe: "I am safe", openness: "Openness", conscientiousness: "Conscientiousness"
  },
  ar: {
    nav_home: "الرئيسية", nav_chat: "محادثة", nav_plan: "خطة", nav_notes: "مذكرات", nav_set: "إعدادات",
    system_opt: "محسن لـ:", role_c: "هيكلة (C+)", role_o: "عمق (O+)", role_flex: "مرونة",
    role_focus: "تركيز", card_chat_title_o: "تستكشف أفكار جديدة؟", card_chat_title_c: "تتابع تقدمك؟",
    card_chat_desc_c: "وضع التوافق.", card_chat_desc_o: "وضع الدمج.", view_plan: "الخطة",
    chat_placeholder: "اكتب...", architect_mode: "وضع المهندس", muse_mode: "وضع الملهم",
    planner_title: "تدفق منظم", completed: "مكتمل", total_goals: "أهداف", add_goal_placeholder: "أضف...",
    ai_detected: "اكتشاف", ai_refined: "تنقيح", notes_new: "جديد", notes_title_placeholder: "عنوان...",
    notes_private: "مشفر", notes_placeholder: "اكتب...", notes_select: "اختر مذكرة.",
    explore_title: "بحث", explore_placeholder: "موضوع...", explore_btn: "بحث",
    synthesis_challenge: "تحدي", crisis_title: "دعم", crisis_msg: "يرجى طلب مساعدة.",
    crisis_call: "122", crisis_safe: "أنا بخير", openness: "انفتاح", conscientiousness: "ضمير"
  }
};

const BIG5_IMPLICIT_PROMPT = `
IDENTITY: You are Aura.
CONTEXT: User C={{C}}%, O={{O}}%.
LANGUAGE: {{LANGUAGE}}
NOTES: {{NOTES_CONTEXT}}
PLANNER: {{PLANNER_CONTEXT}}

STYLE:
- NO greetings (Hey, Hello). Jump to topic.
- Casual, authentic, concise.
- If Arabic: Egyptian Dialect (Masri).

LOGIC:
- If task exists in Planner -> UPDATE/SPLIT.
- If new task -> ADD.
- If in Notes -> Discuss but DO NOT add unless asked.

OUTPUT JSON:
{ "reply": "string", "task_action": { "type": "ADD"|"UPDATE"|"SPLIT"|"NONE", "target_task_id": "string", "new_tasks": ["string"] } }
`;

const PROACTIVE_NUDGE_PROMPT = `
TASK: Nudge user.
CONTEXT: C={{C}}%, O={{O}}%.
LANG: {{LANGUAGE}} (Egyptian if Arabic).
STYLE: No greetings.
OUTPUT JSON: { "nudge_message": "string" }
`;

export default function AuraEcosystem() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [crisisMode, setCrisisMode] = useState(false);
  const [lang, setLang] = useState('en'); 
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    const initAuth = async () => { await signInAnonymously(auth); };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (u) {
            setUser(u);
            getDoc(doc(db, 'artifacts', appId, 'users', u.uid, 'data', 'psychometrics')).then(s => {
                setStats(s.exists() ? s.data() : null);
                setLoading(false);
            });
        }
    });
    return () => unsubscribe();
  }, []);

  const t = TEXTS[lang];
  const isRTL = lang === 'ar';

  if (crisisMode) return <CrisisOverlay onClose={() => setCrisisMode(false)} t={t} isRTL={isRTL} />;
  if (loading || !user) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-cyan-500" /></div>;
  if (!stats) return <Phase1Assessment userUid={user.uid} onComplete={(newStats) => setStats(newStats)} />;

  return (
    <div className={`min-h-screen bg-black text-slate-200 font-sans ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-black to-black pointer-events-none"></div>
        <div className="relative z-10 w-full max-w-7xl mx-auto h-screen p-4 flex gap-4">
            <nav className="w-20 bg-slate-900/50 border border-white/10 rounded-3xl flex flex-col items-center py-8 gap-6 backdrop-blur-md h-full z-20">
                <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center text-white font-bold mb-4">A</div>
                <NavButtonMini icon={<Activity />} label={t.nav_home} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <NavButtonMini icon={<MessageSquare />} label={t.nav_chat} active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                <NavButtonMini icon={<ListTodo />} label={t.nav_plan} active={activeTab === 'planner'} onClick={() => setActiveTab('planner')} />
                <NavButtonMini icon={<FileText />} label={t.nav_notes} active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
                <div className="mt-auto flex flex-col gap-4">
                     <button onClick={() => setLang(prev => prev === 'en' ? 'ar' : 'en')} className="p-3 rounded-xl text-slate-500 hover:text-cyan-400 hover:bg-white/5 transition-all"><Languages size={24} /></button>
                </div>
            </nav>
            <main className="flex-1 bg-slate-900/30 border border-white/5 rounded-3xl backdrop-blur-sm overflow-hidden relative">
                {activeTab === 'dashboard' && <DashboardView user={user} stats={stats} setActiveTab={setActiveTab} t={t} isRTL={isRTL} />}
                {activeTab === 'chat' && <ImplicitChat user={user} stats={stats} appId={appId} setCrisisMode={setCrisisMode} messages={chatMessages} setMessages={setChatMessages} lang={lang} t={t} isRTL={isRTL} />}
                {activeTab === 'planner' && <AdaptivePlanner user={user} stats={stats} appId={appId} t={t} isRTL={isRTL} />}
                {activeTab === 'notes' && <NeuroNotes user={user} stats={stats} appId={appId} setCrisisMode={setCrisisMode} t={t} isRTL={isRTL} />}
                {activeTab === 'explore' && <ExploreEngine user={user} stats={stats} onClose={() => setActiveTab('chat')} t={t} isRTL={isRTL} />}
            </main>
        </div>
    </div>
  );
}

const DashboardView = ({ stats, setActiveTab, t, isRTL }) => (
    <div className="p-8 h-full overflow-y-auto animate-fade-in">
        <header className="mb-8">
            <h1 className="text-4xl font-light text-white">Protocol <span className="text-cyan-500">Online</span>.</h1>
            <p className="text-slate-400 mt-2">{t.system_opt} <span className="text-white ml-2 font-mono">{stats.c_score > 50 ? t.role_c : t.role_flex} | {stats.o_score > 50 ? t.role_o : t.role_focus}</span></p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 rounded-3xl p-8 relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('chat')}>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div><span className="text-xs font-bold uppercase tracking-widest text-green-400">BIG5-CHAT ENGINE</span></div>
                    <h3 className="text-2xl text-white font-light mb-2">{stats.o_score > 50 ? t.card_chat_title_o : t.card_chat_title_c}</h3>
                    <p className="text-slate-300 max-w-md">{stats.c_score > 50 ? t.card_chat_desc_c : t.card_chat_desc_o}</p>
                </div>
                <Brain className={`absolute bottom-[-20px] text-white/5 w-64 h-64 group-hover:scale-110 transition-transform duration-700 ${isRTL ? 'left-[-20px]' : 'right-[-20px]'}`} />
            </div>
            <div className="bg-slate-800/40 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                <div><div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.openness}</div><div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{width: `${stats.o_score}%`}}></div></div></div>
                <div><div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.conscientiousness}</div><div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${stats.c_score}%`}}></div></div></div>
                <button onClick={() => setActiveTab('planner')} className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white transition-colors flex items-center justify-center gap-2"><Zap size={14} /> {t.view_plan}</button>
            </div>
        </div>
    </div>
);

const ImplicitChat = ({ user, stats, appId, messages, setMessages, lang, t, isRTL }) => {
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);
    const [plannerContext, setPlannerContext] = useState("");
    const [notesContext, setNotesContext] = useState("");

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
    useEffect(() => {
        const fetchCtx = async () => {
            const pSnap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'planner'));
            setPlannerContext(pSnap.docs.map(d => `${d.id} | ${d.data().task}`).join("\n"));
            const nSnap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'));
            setNotesContext(nSnap.docs.slice(0,5).map(d => d.data().title).join(", "));
        };
        fetchCtx();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        const text = input; setInput(''); setIsTyping(true);
        setMessages(prev => [...prev, { text, sender: 'user' }]);

        try {
            const prompt = BIG5_IMPLICIT_PROMPT
                .replace('{{C}}', stats.c_score).replace('{{O}}', stats.o_score)
                .replace('{{PLANNER_CONTEXT}}', plannerContext).replace('{{NOTES_CONTEXT}}', notesContext)
                .replace('{{LANGUAGE}}', lang === 'ar' ? 'Arabic (Egyptian)' : 'English');

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: `${prompt}\n\nUSER: "${text}"` }] }] })
            });
            const data = await res.json();
            if (!data.candidates) throw new Error("AI Busy or Key Invalid");
            
            const result = JSON.parse(data.candidates[0].content.parts[0].text);
            setMessages(prev => [...prev, { text: result.reply, sender: 'ai' }]);

            if (result.task_action && result.task_action.type !== "NONE") {
                const batch = writeBatch(db);
                const pRef = collection(db, 'artifacts', appId, 'users', user.uid, 'planner');
                if (result.task_action.type === "ADD") {
                    result.task_action.new_tasks.forEach(task => batch.set(doc(pRef), { task: `${task}`, status: 'todo', source: 'ai', createdAt: serverTimestamp() }));
                }
                await batch.commit();
            }
        } catch (err) {
            setMessages(prev => [...prev, { text: `[Error: ${err.message}] Check Gemini Key.`, sender: 'system' }]);
        } finally { setIsTyping(false); }
    };

    return (
        <div className="h-full flex flex-col bg-black/20">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${m.sender === 'user' ? 'bg-cyan-600 text-white' : m.sender === 'system' ? 'bg-red-900/50 text-red-200' : 'bg-slate-800 text-slate-200'}`}>{m.text}</div>
                    </div>
                ))}
                {isTyping && <div className="text-slate-500 text-xs ml-4">Aura is thinking...</div>}
                <div ref={scrollRef} />
            </div>
            <form onSubmit={handleSend} className="p-4 bg-slate-900 border-t border-white/5 flex gap-2">
                <input className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 text-white" placeholder={t.chat_placeholder} value={input} onChange={e => setInput(e.target.value)} dir={isRTL ? "rtl" : "ltr"} />
                <button type="submit" className="p-4 bg-cyan-600/20 text-cyan-400 rounded-xl"><ArrowRight size={20} /></button>
            </form>
        </div>
    );
};

const AdaptivePlanner = ({ user, stats, appId, t, isRTL }) => {
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState('');
    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'planner'), orderBy('createdAt', 'desc')), (snap) => {
            setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);
    const addTask = async (e) => {
        e.preventDefault(); if(!newTask.trim()) return;
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'planner'), { task: newTask, status: 'todo', source: 'manual', createdAt: serverTimestamp() });
        setNewTask('');
    };
    return (
        <div className="h-full flex flex-col p-8">
            <h2 className="text-3xl font-light text-white mb-8">{t.planner_title}</h2>
            <form onSubmit={addTask} className="flex gap-4 mb-8">
                <input className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl p-4 text-white" placeholder={t.add_goal_placeholder} value={newTask} onChange={e => setNewTask(e.target.value)} dir={isRTL ? "rtl" : "ltr"} />
                <button type="submit" className="bg-amber-600 text-white p-4 rounded-xl"><Plus size={20} /></button>
            </form>
            <div className="flex-1 overflow-y-auto space-y-3">
                {tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-slate-800/60">
                        <span className={task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}>{task.task}</span>
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'planner', task.id))}><Trash2 size={16} className="text-slate-600 hover:text-red-400" /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const NeuroNotes = ({ user, appId, t, isRTL }) => {
    const [notes, setNotes] = useState([]);
    const [active, setActive] = useState(null);
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), (snap) => {
            setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);
    const save = async () => {
        if (!active) return;
        if (active.id) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', active.id), { title: active.title, content: active.content });
        else { const ref = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), { ...active, createdAt: serverTimestamp() }); setActive({ ...active, id: ref.id }); }
    };
    return (
        <div className="h-full flex">
            <div className={`w-64 border-white/5 p-4 flex flex-col bg-black/20 ${isRTL ? 'border-l' : 'border-r'}`}>
                <button onClick={() => setActive({ title: '', content: '' })} className="w-full py-3 bg-pink-600 text-white rounded-xl font-bold mb-4">{t.notes_new}</button>
                <div className="space-y-2">{notes.map(n => <button key={n.id} onClick={() => setActive(n)} className="w-full text-left p-3 rounded-lg text-slate-400 hover:bg-white/10">{n.title || 'Untitled'}</button>)}</div>
            </div>
            <div className="flex-1 p-8 flex flex-col">
                {active ? (
                    <>
                        <div className="flex justify-between mb-4"><input value={active.title} onChange={e => setActive({...active, title: e.target.value})} placeholder={t.notes_title_placeholder} className="bg-transparent text-3xl text-white outline-none" /><button onClick={save}><Save className="text-cyan-400" /></button></div>
                        <textarea value={active.content} onChange={e => setActive({...active, content: e.target.value})} placeholder={t.notes_placeholder} className="flex-1 bg-transparent text-slate-300 outline-none resize-none" />
                    </>
                ) : <div className="text-slate-600 m-auto">{t.notes_select}</div>}
            </div>
        </div>
    );
};

const ExploreEngine = ({ onClose, t }) => {
    const [topic, setTopic] = useState('');
    const [res, setRes] = useState(null);
    const [load, setLoad] = useState(false);
    const handleExplore = async () => {
        setLoad(true);
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `EXPLORE: ${topic}. JSON: { synthesis_challenge: string, connections: [{ type: string, concept: string, relation: string }] }` }] }] })
        });
        const d = await r.json();
        setRes(JSON.parse(d.candidates[0].content.parts[0].text));
        setLoad(false);
    };
    return (
        <div className="h-full flex flex-col p-8">
            <div className="flex justify-between mb-8"><h2 className="text-3xl text-white">{t.explore_title}</h2><button onClick={onClose}><X /></button></div>
            <div className="flex gap-4 mb-8"><input className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl p-4 text-white" value={topic} onChange={e => setTopic(e.target.value)} /><button onClick={handleExplore} className="bg-pink-600 text-white px-6 rounded-xl">{load ? '...' : t.explore_btn}</button></div>
            {res && <div className="space-y-4">{res.connections.map((c, i) => <div key={i} className="p-4 bg-white/5 rounded-xl"><h4 className="text-white">{c.concept}</h4><p className="text-slate-400">{c.relation}</p></div>)}</div>}
        </div>
    );
};

const CrisisOverlay = ({ onClose, t, isRTL }) => (
    <div className="fixed inset-0 z-50 bg-red-950/90 flex items-center justify-center p-8" dir={isRTL ? "rtl" : "ltr"}>
        <div className="bg-black border border-red-500 rounded-3xl p-8 max-w-lg text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-3xl text-white font-bold mb-4">{t.crisis_title}</h2>
            <p className="text-slate-300 mb-8">{t.crisis_msg}</p>
            <button onClick={onClose} className="w-full py-4 border border-white/20 text-slate-400 rounded-xl hover:text-white">{t.crisis_safe}</button>
        </div>
    </div>
);
