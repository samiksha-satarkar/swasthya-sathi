import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

const GENDERS = ['Female', 'Male', 'Other'];
const EMPTY_FORM = { name: '', age: '', gender: 'Female', symptoms: '', diagnosis: '', village: '' };

const LANGUAGES = [
  { code: 'en-IN', label: 'English', name: 'English' }, 
  { code: 'hi-IN', label: 'हिन्दी', name: 'Hindi' },
  { code: 'mr-IN', label: 'मराठी', name: 'Marathi' },
 
  { code: 'bn-IN', label: 'বাংলা', name: 'Bengali' },
  { code: 'te-IN', label: 'తెలుగు', name: 'Telugu' },
  { code: 'ta-IN', label: 'தமிழ்', name: 'Tamil' },
  { code: 'gu-IN', label: 'ગુજરાતી', name: 'Gujarati' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ', name: 'Kannada' },
];

const UI_TEXT = {
  'hi-IN': { addPatient:'मरीज़ जोड़ें', search:'मरीज़, गाँव खोजें...', patientRecords:'मरीज़ों के रिकॉर्ड', name:'नाम', age:'उम्र', gender:'लिंग', village:'गाँव', symptoms:'लक्षण', diagnosis:'निदान', save:'रिकॉर्ड सेव करें', listening:'सुन रहे हैं...', tapToSpeak:'बोलने के लिए दबाएं', totalPatients:'कुल मरीज़', female:'महिला', male:'पुरुष', villages:'गाँव', allPatients:'सभी मरीज़', records:'रिकॉर्ड', noPatients:'अभी कोई मरीज़ नहीं।', saved:'रिकॉर्ड सफलतापूर्वक सेव हुआ!', deleted:'रिकॉर्ड हटाया गया', fillFields:'कृपया सभी ज़रूरी फ़ील्ड भरें', newRecord:'नया मरीज़ रिकॉर्ड', voiceHint:'माइक दबाएं और लक्षण बोलें' },
  'mr-IN': { addPatient:'रुग्ण जोडा', search:'रुग्ण, गाव शोधा...', patientRecords:'रुग्णांचे रेकॉर्ड', name:'नाव', age:'वय', gender:'लिंग', village:'गाव', symptoms:'लक्षणे', diagnosis:'निदान', save:'रेकॉर्ड जतन करा', listening:'ऐकत आहे...', tapToSpeak:'बोलण्यासाठी दाबा', totalPatients:'एकूण रुग्ण', female:'महिला', male:'पुरुष', villages:'गावे', allPatients:'सर्व रुग्ण', records:'नोंदी', noPatients:'अद्याप कोणतेही रुग्ण नाहीत.', saved:'रेकॉर्ड यशस्वीरित्या जतन झाला!', deleted:'रेकॉर्ड हटवला', fillFields:'कृपया सर्व आवश्यक फील्ड भरा', newRecord:'नवीन रुग्ण नोंद', voiceHint:'माइक दाबा आणि लक्षणे सांगा' },
  'en-IN': { addPatient:'Add Patient', search:'Search patients, village...', patientRecords:'Patient Records', name:'Name', age:'Age', gender:'Gender', village:'Village', symptoms:'Symptoms', diagnosis:'Diagnosis', save:'Save Patient Record', listening:'Listening...', tapToSpeak:'Tap to speak', totalPatients:'Total Patients', female:'Female', male:'Male', villages:'Villages', allPatients:'All Patients', records:'records', noPatients:'No patients yet. Add your first record!', saved:'Patient saved successfully!', deleted:'Record deleted', fillFields:'Please fill all required fields', newRecord:'New Patient Record', voiceHint:'Press mic and speak symptoms' },
  'bn-IN': { addPatient:'রোগী যোগ করুন', search:'রোগী, গ্রাম খুঁজুন...', patientRecords:'রোগীর রেকর্ড', name:'নাম', age:'বয়স', gender:'লিঙ্গ', village:'গ্রাম', symptoms:'উপসর্গ', diagnosis:'রোগ নির্ণয়', save:'রেকর্ড সেভ করুন', listening:'শুনছি...', tapToSpeak:'বলতে চাপুন', totalPatients:'মোট রোগী', female:'মহিলা', male:'পুরুষ', villages:'গ্রাম', allPatients:'সকল রোগী', records:'রেকর্ড', noPatients:'এখনো কোনো রোগী নেই।', saved:'রেকর্ড সফলভাবে সেভ হয়েছে!', deleted:'রেকর্ড মুছে ফেলা হয়েছে', fillFields:'সকল প্রয়োজনীয় তথ্য পূরণ করুন', newRecord:'নতুন রোগীর রেকর্ড', voiceHint:'মাইক চাপুন এবং উপসর্গ বলুন' },
  'te-IN': { addPatient:'రోగిని జోడించు', search:'రోగి, గ్రామం వెతకండి...', patientRecords:'రోగుల రికార్డులు', name:'పేరు', age:'వయసు', gender:'లింగం', village:'గ్రామం', symptoms:'లక్షణాలు', diagnosis:'నిర్ధారణ', save:'రికార్డు సేవ్ చేయి', listening:'వింటున్నాను...', tapToSpeak:'మాట్లాడటానికి నొక్కండి', totalPatients:'మొత్తం రోగులు', female:'స్త్రీ', male:'పురుషుడు', villages:'గ్రామాలు', allPatients:'అందరు రోగులు', records:'రికార్డులు', noPatients:'ఇంకా రోగులు లేరు.', saved:'రికార్డు విజయవంతంగా సేవ్ అయింది!', deleted:'రికార్డు తొలగించబడింది', fillFields:'అన్ని అవసరమైన ఫీల్డ్‌లు పూరించండి', newRecord:'కొత్త రోగి రికార్డు', voiceHint:'మైక్ నొక్కి లక్షణాలు చెప్పండి' },
  'ta-IN': { addPatient:'நோயாளியை சேர்க்கவும்', search:'நோயாளி, கிராமம் தேடுங்கள்...', patientRecords:'நோயாளி பதிவுகள்', name:'பெயர்', age:'வயது', gender:'பாலினம்', village:'கிராமம்', symptoms:'அறிகுறிகள்', diagnosis:'நோய் கண்டறிதல்', save:'பதிவை சேமிக்கவும்', listening:'கேட்கிறேன்...', tapToSpeak:'பேச அழுத்தவும்', totalPatients:'மொத்த நோயாளிகள்', female:'பெண்', male:'ஆண்', villages:'கிராமங்கள்', allPatients:'அனைத்து நோயாளிகள்', records:'பதிவுகள்', noPatients:'இன்னும் நோயாளிகள் இல்லை.', saved:'பதிவு வெற்றிகரமாக சேமிக்கப்பட்டது!', deleted:'பதிவு நீக்கப்பட்டது', fillFields:'அனைத்து தேவையான புலங்களையும் நிரப்பவும்', newRecord:'புதிய நோயாளி பதிவு', voiceHint:'மைக்கை அழுத்தி அறிகுறிகளை சொல்லுங்கள்' },
  'gu-IN': { addPatient:'દર્દી ઉમેરો', search:'દર્દી, ગામ શોધો...', patientRecords:'દર્દીઓના રેકોર્ડ', name:'નામ', age:'ઉંમર', gender:'જાતિ', village:'ગામ', symptoms:'લક્ષણો', diagnosis:'નિદાન', save:'રેકોર્ડ સેવ કરો', listening:'સાંભળી રહ્યા છીએ...', tapToSpeak:'બોલવા માટે દબાવો', totalPatients:'કુલ દર્દીઓ', female:'સ્ત્રી', male:'પુરુષ', villages:'ગામો', allPatients:'તમામ દર્દીઓ', records:'રેકોર્ડ', noPatients:'હજુ કોઈ દર્દી નથી.', saved:'રેકોર્ડ સફળતાપૂર્વક સેવ થયો!', deleted:'રેકોર્ડ કાઢી નાખ્યો', fillFields:'કૃપા કરીને બધા જરૂરી ફીલ્ડ ભરો', newRecord:'નવો દર્દી રેકોર્ડ', voiceHint:'માઇક દબાવો અને લક્ષણો બોલો' },
  'kn-IN': { addPatient:'ರೋಗಿಯನ್ನು ಸೇರಿಸಿ', search:'ರೋಗಿ, ಗ್ರಾಮ ಹುಡುಕಿ...', patientRecords:'ರೋಗಿಗಳ ದಾಖಲೆಗಳು', name:'ಹೆಸರು', age:'ವಯಸ್ಸು', gender:'ಲಿಂಗ', village:'ಗ್ರಾಮ', symptoms:'ರೋಗಲಕ್ಷಣಗಳು', diagnosis:'ರೋಗನಿರ್ಣಯ', save:'ದಾಖಲೆ ಉಳಿಸಿ', listening:'ಕೇಳುತ್ತಿದ್ದೇನೆ...', tapToSpeak:'ಮಾತನಾಡಲು ಒತ್ತಿರಿ', totalPatients:'ಒಟ್ಟು ರೋಗಿಗಳು', female:'ಮಹಿಳೆ', male:'ಪುರುಷ', villages:'ಗ್ರಾಮಗಳು', allPatients:'ಎಲ್ಲಾ ರೋಗಿಗಳು', records:'ದಾಖಲೆಗಳು', noPatients:'ಇನ್ನೂ ರೋಗಿಗಳಿಲ್ಲ.', saved:'ದಾಖಲೆ ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ!', deleted:'ದಾಖಲೆ ಅಳಿಸಲಾಗಿದೆ', fillFields:'ಎಲ್ಲಾ ಅಗತ್ಯ ಕ್ಷೇತ್ರಗಳನ್ನು ತುಂಬಿಸಿ', newRecord:'ಹೊಸ ರೋಗಿ ದಾಖಲೆ', voiceHint:'ಮೈಕ್ ಒತ್ತಿ ರೋಗಲಕ್ಷಣಗಳನ್ನು ಹೇಳಿ' },
};

export default function Dashboard() {
  const [patients, setPatients]       = useState([]);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [loading, setLoading]         = useState(false);
  const [fetching, setFetching]       = useState(true);
  const [toast, setToast]             = useState(null);
  const [search, setSearch]           = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [selected, setSelected]       = useState(null);
  const [lang, setLang]               = useState('hi-IN');
  const [listening, setListening]     = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [transcript, setTranscript]   = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef(null);
  const t = UI_TEXT[lang] || UI_TEXT['en-IN'];

  useEffect(() => {
    loadPatients();
    if (typeof window !== 'undefined') {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      setVoiceSupported(!!SR);
    }
  }, []);

  async function loadPatients() {
    setFetching(true);
    const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (!error) setPatients(data || []);
    setFetching(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.age || !form.village) { showToast(t.fillFields, 'error'); return; }
    setLoading(true);
    const { data, error } = await supabase.from('patients').insert([{ ...form, age: Number(form.age) }]).select().single();
    setLoading(false);
    if (error) { showToast(error.message, 'error'); return; }
    setPatients(prev => [data, ...prev]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    showToast(t.saved, 'success');
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (!error) { setPatients(prev => prev.filter(p => p.id !== id)); if (selected?.id === id) setSelected(null); showToast(t.deleted, 'info'); }
  }

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); }

  function startVoice(fieldName) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast('Voice not supported in this browser. Use Chrome.', 'error'); return; }
    if (recognitionRef.current) recognitionRef.current.stop();
    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => { setListening(true); setActiveField(fieldName); setTranscript(''); };
    recognition.onresult = (event) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const txt = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += txt; else interim += txt;
      }
      setTranscript(interim || final);
      if (final) setForm(prev => ({ ...prev, [fieldName]: prev[fieldName] ? prev[fieldName] + ', ' + final : final }));
    };
    recognition.onerror = (e) => { setListening(false); setActiveField(null); if (e.error !== 'aborted') showToast('Voice error: ' + e.error, 'error'); };
    recognition.onend = () => { setListening(false); setActiveField(null); setTranscript(''); };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopVoice() { if (recognitionRef.current) recognitionRef.current.stop(); setListening(false); setActiveField(null); }

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.village.toLowerCase().includes(search.toLowerCase()) ||
    (p.symptoms || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: patients.length,
    female: patients.filter(p => p.gender === 'Female').length,
    male: patients.filter(p => p.gender === 'Male').length,
    villages: [...new Set(patients.map(p => p.village))].length,
  };

  const MicBtn = ({ field, isTextarea }) => !voiceSupported ? null : (
    <button type="button"
      className={`mic-btn ${activeField === field && listening ? 'listening' : ''}`}
      onClick={() => activeField === field && listening ? stopVoice() : startVoice(field)}
      title={t.tapToSpeak}
      style={isTextarea ? { top: '0.7rem', transform: 'none' } : {}}>
      {activeField === field && listening ? '🔴' : '🎙'}
    </button>
  );

  return (
    <>
      <Head>
        <title>SwasthyaSathi · Dashboard</title>
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root{--g1:#0a4d2e;--g2:#1a7a4a;--g3:#2ecc71;--gpale:#d4f5e2;--gcards:#f0faf4;--saf:#e67e22;--safl:#fdecd2;--ink:#0d1f14;--muted:#5a7366;--border:#c8e6d4;--red:#e74c3c;}
        body{font-family:'DM Sans',sans-serif;background:#f4f9f6;color:var(--ink);}
        .shell{display:flex;min-height:100vh;}
        .sidebar{width:240px;flex-shrink:0;background:var(--g1);color:white;display:flex;flex-direction:column;padding:1.5rem 1rem;position:fixed;top:0;left:0;bottom:0;z-index:50;}
        .sb-logo{font-family:'Sora',sans-serif;font-weight:800;font-size:1.15rem;padding:0.5rem 0.8rem 1rem;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:0.8rem;}
        .sb-logo span{color:var(--g3);}
        .lang-picker{padding:0.4rem 0.8rem 0.8rem;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:0.8rem;}
        .lang-picker label{font-size:0.65rem;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:0.3rem;}
        .lang-select{width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:white;border-radius:8px;padding:0.45rem 0.6rem;font-size:0.82rem;font-family:'DM Sans',sans-serif;cursor:pointer;outline:none;}
        .lang-select option{background:#0a4d2e;}
        .sb-nav{display:flex;flex-direction:column;gap:0.3rem;flex:1;}
        .sb-link{display:flex;align-items:center;gap:0.7rem;padding:0.65rem 0.8rem;border-radius:10px;font-size:0.88rem;font-weight:500;color:rgba(255,255,255,0.65);cursor:pointer;transition:all .2s;text-decoration:none;border:none;background:none;width:100%;text-align:left;}
        .sb-link:hover{background:rgba(255,255,255,0.08);color:white;}
        .sb-link.active{background:var(--g2);color:white;}
        .sb-footer{font-size:0.72rem;color:rgba(255,255,255,0.35);padding:0.8rem;}
        .main{margin-left:240px;flex:1;display:flex;flex-direction:column;}
        .topbar{background:white;border-bottom:1px solid var(--border);padding:1rem 2rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40;}
        .topbar h1{font-family:'Sora',sans-serif;font-weight:700;font-size:1.15rem;}
        .topbar-right{display:flex;align-items:center;gap:1rem;}
        .search-box{display:flex;align-items:center;gap:0.5rem;background:var(--gcards);border:1px solid var(--border);border-radius:50px;padding:0.45rem 1rem;}
        .search-box input{border:none;background:none;outline:none;font-size:0.85rem;width:200px;font-family:'DM Sans',sans-serif;}
        .btn-add{display:flex;align-items:center;gap:0.4rem;background:var(--g2);color:white;padding:0.55rem 1.2rem;border-radius:50px;border:none;cursor:pointer;font-weight:600;font-size:0.88rem;font-family:'DM Sans',sans-serif;transition:all .2s;}
        .btn-add:hover{background:var(--g1);transform:translateY(-1px);}
        .content{padding:2rem;flex:1;}
        .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1.2rem;margin-bottom:2rem;}
        .stat-card{background:white;border-radius:16px;padding:1.4rem 1.6rem;border:1px solid var(--border);display:flex;align-items:center;gap:1rem;transition:box-shadow .2s;}
        .stat-card:hover{box-shadow:0 4px 20px #1a7a4a12;}
        .stat-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;}
        .stat-icon.green{background:var(--gpale);} .stat-icon.orange{background:var(--safl);} .stat-icon.blue{background:#e8f4fd;} .stat-icon.pink{background:#fde8f0;}
        .stat-num{font-family:'Sora',sans-serif;font-weight:800;font-size:1.8rem;line-height:1;}
        .stat-label{font-size:0.78rem;color:var(--muted);margin-top:0.2rem;}
        .table-card{background:white;border-radius:16px;border:1px solid var(--border);overflow:hidden;}
        .table-head{padding:1.2rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
        .table-head h2{font-family:'Sora',sans-serif;font-weight:700;font-size:1rem;}
        .count-badge{background:var(--gpale);color:var(--g2);border-radius:50px;padding:0.2rem 0.7rem;font-size:0.75rem;font-weight:700;}
        table{width:100%;border-collapse:collapse;}
        thead tr{background:#f8fdf9;}
        th{padding:0.75rem 1.2rem;text-align:left;font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border);}
        tbody tr{border-bottom:1px solid #f0f7f3;cursor:pointer;transition:background .15s;}
        tbody tr:hover{background:var(--gcards);}
        tbody tr:last-child{border-bottom:none;}
        td{padding:0.9rem 1.2rem;font-size:0.88rem;vertical-align:middle;}
        .name-cell{font-weight:600;}
        .village-cell{color:var(--muted);font-size:0.82rem;}
        .gender-badge{display:inline-block;border-radius:50px;padding:0.2rem 0.65rem;font-size:0.72rem;font-weight:600;}
        .gender-badge.female{background:#fde8f0;color:#c0145a;} .gender-badge.male{background:#e8f0fd;color:#144ec0;} .gender-badge.other{background:var(--safl);color:var(--saf);}
        .symptom-cell{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:0.82rem;}
        .date-cell{color:var(--muted);font-size:0.78rem;}
        .action-btn{background:none;border:none;cursor:pointer;padding:0.3rem 0.5rem;border-radius:6px;font-size:0.85rem;transition:background .15s;}
        .action-btn:hover{background:#fee;}
        .empty-state{text-align:center;padding:4rem 2rem;color:var(--muted);}
        .empty-state .emoji{font-size:3rem;margin-bottom:1rem;}
        .overlay{position:fixed;inset:0;background:rgba(10,30,20,0.45);z-index:100;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation:fadeIn .2s ease;}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .modal{background:white;border-radius:24px;padding:2rem;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);animation:slideUp .25s ease;}
        @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        .modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;}
        .modal-header h2{font-family:'Sora',sans-serif;font-weight:700;font-size:1.1rem;}
        .close-btn{background:#f0f0f0;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;}
        .close-btn:hover{background:#e0e0e0;}
        .voice-banner{background:linear-gradient(135deg,var(--g1),var(--g2));border-radius:14px;padding:1rem 1.2rem;margin-bottom:1.2rem;display:flex;align-items:center;gap:1rem;}
        .voice-lang-badge{background:rgba(255,255,255,0.18);border-radius:8px;padding:0.3rem 0.7rem;font-size:0.82rem;color:white;font-weight:700;}
        .voice-hint-text{font-size:0.8rem;color:rgba(255,255,255,0.75);flex:1;}
        .wave-mini{display:flex;align-items:center;gap:2px;}
        .wave-mini .b{width:3px;background:var(--g3);border-radius:3px;animation:wv 0.8s ease-in-out infinite;}
        .wave-mini .b:nth-child(1){height:8px;animation-delay:0s} .wave-mini .b:nth-child(2){height:16px;animation-delay:.1s} .wave-mini .b:nth-child(3){height:12px;animation-delay:.2s} .wave-mini .b:nth-child(4){height:20px;animation-delay:.3s} .wave-mini .b:nth-child(5){height:10px;animation-delay:.4s}
        @keyframes wv{0%,100%{transform:scaleY(1)}50%{transform:scaleY(0.3)}}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
        .form-group{display:flex;flex-direction:column;gap:0.4rem;}
        .form-group.full{grid-column:1/-1;}
        label{font-size:0.78rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;}
        .required{color:var(--saf);}
        .input-wrap{position:relative;}
        input,select,textarea{width:100%;padding:0.65rem 0.9rem;border:1.5px solid var(--border);border-radius:10px;font-size:0.9rem;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s;background:var(--gcards);color:var(--ink);}
        input:focus,select:focus,textarea:focus{border-color:var(--g2);background:white;}
        textarea{resize:vertical;min-height:70px;}
        .has-mic input,.has-mic textarea{padding-right:2.8rem;}
        .mic-btn{position:absolute;right:0.5rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:0.3rem;border-radius:8px;font-size:1.1rem;transition:all .2s;}
        .mic-btn:hover{background:var(--gpale);}
        .mic-btn.listening{background:var(--gpale);animation:micPulse 1s infinite;}
        .mic-btn.textarea-mic{top:0.7rem;transform:none;}
        @keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(46,204,113,0.4)}50%{box-shadow:0 0 0 8px rgba(46,204,113,0)}}
        .transcript-box{background:var(--gpale);border-radius:8px;padding:0.45rem 0.8rem;font-size:0.8rem;color:var(--g1);margin-top:0.3rem;font-style:italic;}
        .btn-submit{width:100%;padding:0.85rem;border-radius:12px;background:var(--g2);color:white;border:none;font-weight:700;font-size:0.95rem;font-family:'DM Sans',sans-serif;cursor:pointer;margin-top:1rem;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:0.5rem;}
        .btn-submit:hover:not(:disabled){background:var(--g1);}
        .btn-submit:disabled{opacity:0.6;cursor:not-allowed;}
        .detail-modal{background:white;border-radius:24px;padding:2rem;width:100%;max-width:460px;box-shadow:0 20px 60px rgba(0,0,0,0.2);animation:slideUp .25s ease;}
        .detail-avatar{width:56px;height:56px;border-radius:50%;background:var(--gpale);display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1rem;}
        .detail-name{font-family:'Sora',sans-serif;font-weight:800;font-size:1.3rem;margin-bottom:0.2rem;}
        .detail-meta{color:var(--muted);font-size:0.85rem;margin-bottom:1.5rem;}
        .detail-row{display:flex;flex-direction:column;gap:0.2rem;margin-bottom:1rem;}
        .dlabel{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);}
        .dval{font-size:0.92rem;color:var(--ink);background:var(--gcards);border-radius:8px;padding:0.5rem 0.8rem;}
        .dval.green{background:var(--gpale);color:var(--g1);}
        .btn-delete{width:100%;padding:0.75rem;border-radius:12px;background:#fff0f0;color:var(--red);border:1.5px solid #fdd;font-weight:700;font-size:0.88rem;font-family:'DM Sans',sans-serif;cursor:pointer;margin-top:1rem;transition:all .2s;}
        .btn-delete:hover{background:#fee;}
        .toast{position:fixed;bottom:2rem;right:2rem;z-index:200;padding:0.9rem 1.4rem;border-radius:14px;font-size:0.88rem;font-weight:600;box-shadow:0 8px 30px rgba(0,0,0,0.15);animation:toastIn .3s ease;display:flex;align-items:center;gap:0.5rem;}
        @keyframes toastIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        .toast.success{background:var(--g1);color:white;} .toast.error{background:var(--red);color:white;} .toast.info{background:var(--ink);color:white;}
        .spinner{width:18px;height:18px;border:2.5px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
        @keyframes spin{to{transform:rotate(360deg);}}
        .skeleton{background:linear-gradient(90deg,#f0f7f3 25%,#e0f0e8 50%,#f0f7f3 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:8px;height:48px;}
        @keyframes shimmer{to{background-position:-200% 0;}}
        @media(max-width:900px){.sidebar{display:none;}.main{margin-left:0;}.stats-row{grid-template-columns:repeat(2,1fr);}.form-grid{grid-template-columns:1fr;}}
      `}</style>

      <div className="shell">
        <aside className="sidebar">
          <div className="sb-logo">🌿 Swasthya<span>Sathi</span></div>
          <div className="lang-picker">
            <label>🌐 Language / भाषा</label>
            <select className="lang-select" value={lang} onChange={e => setLang(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label} — {l.name}</option>)}
            </select>
          </div>
          <nav className="sb-nav">
            <a href="/" className="sb-link"><span>🏠</span> Home</a>
            <button className="sb-link active"><span>🩺</span> {t.allPatients}</button>
            <button className="sb-link"><span>📊</span> Reports</button>
            <button className="sb-link"><span>💉</span> Vaccinations</button>
            <button className="sb-link"><span>🔔</span> Reminders</button>
            <button className="sb-link"><span>⚙️</span> Settings</button>
          </nav>
          <div className="sb-footer">ASHA Worker Portal · v1.0</div>
        </aside>

        <div className="main">
          <header className="topbar">
            <h1>{t.patientRecords}</h1>
            <div className="topbar-right">
              <div className="search-box">
                <span>🔍</span>
                <input placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button className="btn-add" onClick={() => setShowForm(true)}>+ {t.addPatient}</button>
            </div>
          </header>

          <main className="content">
            <div className="stats-row">
              <div className="stat-card"><div className="stat-icon green">🧑‍⚕️</div><div><div className="stat-num">{stats.total}</div><div className="stat-label">{t.totalPatients}</div></div></div>
              <div className="stat-card"><div className="stat-icon pink">👩</div><div><div className="stat-num">{stats.female}</div><div className="stat-label">{t.female}</div></div></div>
              <div className="stat-card"><div className="stat-icon blue">👨</div><div><div className="stat-num">{stats.male}</div><div className="stat-label">{t.male}</div></div></div>
              <div className="stat-card"><div className="stat-icon orange">🏘</div><div><div className="stat-num">{stats.villages}</div><div className="stat-label">{t.villages}</div></div></div>
            </div>

            <div className="table-card">
              <div className="table-head">
                <h2>{t.allPatients}</h2>
                <span className="count-badge">{filtered.length} {t.records}</span>
              </div>
              {fetching ? (
                <div style={{padding:'1.5rem',display:'flex',flexDirection:'column',gap:'0.8rem'}}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state"><div className="emoji">🏥</div><p>{t.noPatients}</p></div>
              ) : (
                <table>
                  <thead><tr><th>{t.name}</th><th>{t.age}</th><th>{t.gender}</th><th>{t.village}</th><th>{t.symptoms}</th><th>Date</th><th></th></tr></thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id} onClick={() => setSelected(p)}>
                        <td className="name-cell">{p.name}</td>
                        <td>{p.age} yrs</td>
                        <td><span className={`gender-badge ${p.gender.toLowerCase()}`}>{p.gender}</span></td>
                        <td className="village-cell">📍 {p.village}</td>
                        <td><div className="symptom-cell">{p.symptoms || '—'}</div></td>
                        <td className="date-cell">{new Date(p.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})}</td>
                        <td><button className="action-btn" onClick={e=>{e.stopPropagation();handleDelete(p.id);}}>🗑</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ADD PATIENT MODAL */}
      {showForm && (
        <div className="overlay" onClick={()=>{setShowForm(false);stopVoice();}}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>🩺 {t.newRecord}</h2>
              <button className="close-btn" onClick={()=>{setShowForm(false);stopVoice();}}>✕</button>
            </div>

            {/* VOICE BANNER */}
            <div className="voice-banner">
              <span style={{fontSize:'1.4rem'}}>🎙</span>
              <div style={{flex:1}}>
                <div style={{color:'white',fontSize:'0.88rem',fontWeight:600,marginBottom:'0.15rem'}}>
                  {listening ? t.listening : t.voiceHint}
                </div>
                <div className="voice-hint-text">
                  {LANGUAGES.find(l=>l.code===lang)?.label} · {LANGUAGES.find(l=>l.code===lang)?.name}
                  {!voiceSupported && ' · (Use Chrome for voice)'}
                </div>
              </div>
              {listening && <div className="wave-mini"><div className="b"/><div className="b"/><div className="b"/><div className="b"/><div className="b"/></div>}
              <span className="voice-lang-badge">{LANGUAGES.find(l=>l.code===lang)?.label}</span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full">
                  <label>{t.name} <span className="required">*</span></label>
                  <div className="input-wrap has-mic">
                    <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Meena Devi" required />
                    <MicBtn field="name" />
                  </div>
                  {activeField==='name' && transcript && <div className="transcript-box">🎙 {transcript}</div>}
                </div>

                <div className="form-group">
                  <label>{t.age} <span className="required">*</span></label>
                  <input type="number" min="1" max="120" value={form.age} onChange={e=>setForm(f=>({...f,age:e.target.value}))} placeholder="34" required />
                </div>

                <div className="form-group">
                  <label>{t.gender} <span className="required">*</span></label>
                  <select value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}>
                    {GENDERS.map(g=><option key={g}>{g}</option>)}
                  </select>
                </div>

                <div className="form-group full">
                  <label>{t.village} <span className="required">*</span></label>
                  <div className="input-wrap has-mic">
                    <input value={form.village} onChange={e=>setForm(f=>({...f,village:e.target.value}))} placeholder="e.g. Rampur, UP" required />
                    <MicBtn field="village" />
                  </div>
                  {activeField==='village' && transcript && <div className="transcript-box">🎙 {transcript}</div>}
                </div>

                <div className="form-group full">
                  <label>{t.symptoms}</label>
                  <div className="input-wrap has-mic">
                    <textarea value={form.symptoms} onChange={e=>setForm(f=>({...f,symptoms:e.target.value}))} placeholder="e.g. बुखार, सिरदर्द / Fever, Headache" />
                    <MicBtn field="symptoms" isTextarea />
                  </div>
                  {activeField==='symptoms' && transcript && <div className="transcript-box">🎙 {transcript}</div>}
                </div>

                <div className="form-group full">
                  <label>{t.diagnosis}</label>
                  <div className="input-wrap has-mic">
                    <textarea value={form.diagnosis} onChange={e=>setForm(f=>({...f,diagnosis:e.target.value}))} placeholder="e.g. Viral Fever — refer to PHC" />
                    <MicBtn field="diagnosis" isTextarea />
                  </div>
                  {activeField==='diagnosis' && transcript && <div className="transcript-box">🎙 {transcript}</div>}
                </div>
              </div>
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? <><span className="spinner"/> Saving...</> : `✅ ${t.save}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL PANEL */}
      {selected && (
        <div className="overlay" onClick={()=>setSelected(null)}>
          <div className="detail-modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div className="detail-avatar">{selected.gender==='Female'?'👩':selected.gender==='Male'?'👨':'🧑'}</div>
              <button className="close-btn" onClick={()=>setSelected(null)}>✕</button>
            </div>
            <div className="detail-name">{selected.name}</div>
            <div className="detail-meta">{selected.age} yrs · {selected.gender} · 📍 {selected.village}</div>
            <div className="detail-row"><div className="dlabel">{t.symptoms}</div><div className="dval">{selected.symptoms||'—'}</div></div>
            <div className="detail-row"><div className="dlabel">{t.diagnosis}</div><div className="dval green">{selected.diagnosis||'Pending'}</div></div>
            <div className="detail-row"><div className="dlabel">Date</div><div className="dval">{new Date(selected.created_at).toLocaleString('en-IN')}</div></div>
            <button className="btn-delete" onClick={()=>handleDelete(selected.id)}>🗑 Delete Record</button>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type==='success'?'✅':toast.type==='error'?'❌':'ℹ️'} {toast.msg}
        </div>
      )}
    </>
  );
}