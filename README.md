# SwasthyaSathi · Supabase Integration Guide
# ================================================

## 1. Install Dependencies

```bash
npm install @supabase/supabase-js
```

## 2. Environment Variables

Create a `.env.local` file in your project root:

```env
# .env.local  (never commit this file to Git)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

Find these values in:
Supabase Dashboard → Settings → API → Project URL & Project API Keys (anon/public)

## 3. Create the Database Table

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Paste the contents of `supabase-schema.sql`
3. Click **Run**

## 4. File Structure

```
lib/
  supabaseClient.js     ← Supabase client singleton
  patientService.js     ← Insert / fetch patient records
components/
  PatientForm.jsx       ← React form component
pages/api/
  patients.js           ← Next.js API route (GET + POST)
dashboard.js
index.js
```

## 5. API Usage Examples

### POST — Save a Patient
```bash
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Meena Devi",
    "age": 34,
    "gender": "Female",
    "symptoms": "Fever, Headache, Body Pain",
    "diagnosis": "Suspected Viral Fever",
    "village": "Rampur, UP"
  }'
```

### GET — Fetch All Patients
```bash
curl http://localhost:3000/api/patients
```

### GET — Filter by Village
```bash
curl "http://localhost:3000/api/patients?village=Rampur&limit=10"
```

## 6. Frontend Usage (React)

```jsx
import { fetchPatients } from '../lib/patientService';
import { useEffect, useState } from 'react';

export default function PatientList() {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    fetchPatients({ limit: 20 }).then(({ data }) => {
      if (data) setPatients(data);
    });
  }, []);

  return (
    <ul>
      {patients.map(p => (
        <li key={p.id}>
          {p.name} · {p.age} · {p.village}
        </li>
      ))}
    </ul>
  );
}
```

## 7. Security Notes

- `NEXT_PUBLIC_*` variables are exposed to the browser — only use the **anon** key here
- Use Row Level Security (RLS) policies in Supabase to restrict data access per user
- For production, add authentication (Supabase Auth) and tighten RLS policies
- Never expose your `service_role` key on the client side
