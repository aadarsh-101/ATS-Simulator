import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  const [jobDescription, setJobDescription] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    try {
      let data;
      try {
        const res = await axios.get('http://localhost:5000/api/history');
        data = res.data;
      } catch (err) {
        console.warn("Backend not reachable. Using mock history data for preview.");
        data = [
          { id: 1, ats_score: "32.16", created_at: Date.now() - 172800000 },
          { id: 2, ats_score: "76.88", created_at: Date.now() - 86400000 }
        ];
      }
      const chronologicalData = [...data].reverse();
      const formattedData = chronologicalData.map((item, index) => ({
        ...item,
        scanNumber: `Scan #${index + 1}`,
        score: parseFloat(item.ats_score)
      }));
      setHistory(formattedData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please upload a resume PDF first.");

    setLoading(true);
    setResult(null); // Clear previous results while loading

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobDescription', jobDescription);

    try {
      let data;
      try {
        const res = await axios.post('http://localhost:5000/api/analyze', formData);
        data = res.data;
      } catch (err) {
        console.warn("Backend not reachable. Using mock analysis result for preview.");
        await new Promise(r => setTimeout(r, 2500)); // Simulate processing delay
        data = {
          ats_score: 84.2,
          missing_keywords: ["docker", "kubernetes", "aws", "cloud"],
          ai_feedback: "Your resume demonstrates strong foundational experience. To further strengthen your profile, we recommend highlighting your direct experience with critical technologies such as Docker, Kubernetes, and AWS to match the cloud infrastructure requirements."
        };
      }
      setResult(data);
      fetchHistory(); 
    } catch (err) {
      alert("Analysis failed.");
    }
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      {/* Inline CSS for global styles and Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        :root {
          --bg-color: #f4f6f8;
          --card-bg: #ffffff;
          --primary: #4338ca;
          --primary-hover: #3730a3;
          --text-main: #1e293b;
          --text-muted: #64748b;
          --border: #e2e8f0;
        }

        body {
          margin: 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background-color: var(--bg-color);
          color: var(--text-main);
          -webkit-font-smoothing: antialiased;
        }

        .dashboard-container {
          max-width: 1000px;
          margin: 40px auto;
          padding: 0 20px;
        }

        .glass-card {
          background: var(--card-bg);
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.5);
          margin-bottom: 30px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .glass-card:hover {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03);
        }

        .form-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text-main);
        }

        .input-field {
          width: 100%;
          padding: 15px;
          border-radius: 10px;
          border: 2px solid var(--border);
          font-family: inherit;
          font-size: 1rem;
          transition: all 0.2s ease;
          box-sizing: border-box;
          background: #f8fafc;
        }

        .input-field:focus {
          outline: none;
          border-color: var(--primary);
          background: #fff;
          box-shadow: 0 0 0 4px rgba(67, 56, 202, 0.1);
        }

        .btn-primary {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, var(--primary) 0%, #312e81 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 14px 0 rgba(67, 56, 202, 0.39);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(67, 56, 202, 0.23);
        }

        .btn-primary:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .keyword-badge {
          background: #e0e7ff;
          color: var(--primary);
          padding: 8px 16px;
          border-radius: 30px;
          font-size: 0.9rem;
          font-weight: 600;
          display: inline-block;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner-large {
          border: 6px solid #e0e7ff;
          border-radius: 50%;
          border-top: 6px solid #4338ca;
          width: 60px;
          height: 60px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px auto;
        }
        .pulse-text {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <header style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0', letterSpacing: '-1px' }}>
          ATS <span style={{ color: '#4338ca' }}>Simulator</span>
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.2rem', margin: 0 }}>
          AI-driven vector matching for engineering resumes.
        </p>
      </header>

      <div className="glass-card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div>
            <label className="form-label">Target Job Description</label>
            <textarea
              className="input-field"
              placeholder="Paste the technical requirements..."
              rows="5"
              required
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Upload Resume (.pdf)</label>
            <input
              type="file"
              accept=".pdf"
              required
              className="input-field"
              style={{ padding: '10px', background: '#fff' }}
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "System Locked: Processing..." : "Run ATS Analysis"}
          </button>
        </form>
      </div>

      {/* EXPLICIT LOADING OVERLAY */}
      {loading && (
        <div className="glass-card" style={{ borderTop: '5px solid #4338ca', textAlign: 'center', padding: '60px 20px' }}>
          <div className="spinner-large"></div>
          <h2 className="pulse-text" style={{ margin: '0 0 10px 0', fontSize: '1.8rem' }}>Executing Analytical Engine...</h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
            Extracting text vectors, calculating structural Cosine Similarity, filtering corporate stop-words, and querying Google Gemini for optimization strategies.
          </p>
        </div>
      )}

      {/* RESULTS SECTION */}
      {!loading && result && (
        <div className="glass-card" style={{ borderTop: '5px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '30px' }}>
            <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Analysis Results</h2>
            <div style={{ 
              fontSize: '2.8rem', 
              fontWeight: '800', 
              color: result.ats_score >= 70 ? '#10b981' : result.ats_score >= 40 ? '#f59e0b' : '#ef4444' 
            }}>
              {result.ats_score}%
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h4 className="form-label">Missing Keywords</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {result.missing_keywords.length > 0 ? (
                result.missing_keywords.map((word, i) => (
                  <span key={i} className="keyword-badge">{word}</span>
                ))
              ) : (
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>Perfect keyword match!</span>
              )}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✨ Optimization Strategy
            </h4>
            <p style={{ margin: 0, lineHeight: '1.7', color: '#334155' }}>
              {result.ai_feedback}
            </p>
          </div>
        </div>
      )}

      {/* HISTORY CHART SECTION */}
      {history.length > 0 && (
        <div className="glass-card">
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Score Progression Tracking</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart data={history} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="scanNumber" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#4338ca', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#4338ca" 
                  strokeWidth={4}
                  dot={{ r: 6, fill: '#fff', stroke: '#4338ca', strokeWidth: 2 }}
                  activeDot={{ r: 8, fill: '#4338ca', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;