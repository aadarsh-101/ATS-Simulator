const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('./config/db');

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const app = express();
app.use(cors());
app.use(express.json());

// Set up Multer to store uploaded PDFs in a temporary 'uploads' folder
const upload = multer({ dest: 'uploads/' });

// Main API endpoint
app.post('/api/analyze', upload.single('resume'), (req, res) => {
    // Validate inputs
    if (!req.file) {
        return res.status(400).json({ error: 'No resume file uploaded.' });
    }

    const jobDescription = req.body.jobDescription;

    if (!jobDescription) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
            error: 'Job description is required.'
        });
    }

    const pdfPath = req.file.path;

    const pythonExecutable = path.join(
        __dirname,
        'scripts',
        'venv',
        'Scripts',
        'python.exe'
    );

    const pythonScript = path.join(
        __dirname,
        'scripts',
        'engine1.py'
    );

    if (!fs.existsSync(pythonExecutable)) {
        console.error(`Python environment missing at: ${pythonExecutable}`);

        if (fs.existsSync(pdfPath))
            fs.unlinkSync(pdfPath);

        return res.status(500).json({
            error: 'Server environment error.',
            details: 'The virtual environment python.exe path could not be found.'
        });
    }

    if (!fs.existsSync(pythonScript)) {
        console.error(`Python engine script missing at: ${pythonScript}`);

        if (fs.existsSync(pdfPath))
            fs.unlinkSync(pdfPath);

        return res.status(500).json({
            error: 'Server environment error.',
            details: 'engine1.py was not found in the scripts folder.'
        });
    }

    const pythonProcess = spawn(
        pythonExecutable,
        ['-u', pythonScript, pdfPath, jobDescription]
    );

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
    });

    pythonProcess.on('close', async (code) => {

        if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }

        if (code !== 0) {
            console.error('Python Error:', errorString);

            return res.status(500).json({
                error: 'Failed to analyze resume.',
                details: errorString
            });
        }

        try {

            const result = JSON.parse(dataString);
            const missingStr = JSON.stringify(result.missing_keywords);

            // Save to database
            await db.query(
                'INSERT INTO analyses (ats_score, missing_keywords) VALUES (?, ?)',
                [result.ats_score, missingStr]
            );

            console.log("Analysis saved to database!");

            // Gemini AI feedback
            let aiFeedback = "AI feedback is currently unavailable.";

            try {

                console.log("Asking Gemini for feedback...");

                const prompt = `
                    You are an expert tech recruiter.

                    I ran a candidate's resume through an ATS simulator.

                    The resume matched the job description by ${result.ats_score}%.

                    The candidate is missing these core skills:
                    ${missingStr}

                    Write a short, professional, and encouraging paragraph (3 sentences) advising the candidate how to improve the resume by adding these skills.

                    Do not use markdown or bold text.
                    `;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt
                });

                aiFeedback = response.text;

                console.log("Gemini feedback received!");

            } catch (aiError) {
                console.error(
                    "Gemini API failed:",
                    aiError.message
                );

            }

            res.json({
                ...result,
                ai_feedback: aiFeedback
            });

        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: 'Error parsing Python output.',
                details: dataString
            });
        }
    });
});

const PORT = process.env.PORT || 5000;

app.get('/api/history', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM analyses ORDER BY created_at DESC LIMIT 5');
        res.json(rows);
    } catch (err) {
        console.error("Database fetch error:", err);
        res.status(500).json({ error: 'Failed to fetch history.' });
    }
});

app.listen(PORT, () => {
    console.log(`ATS Simulator Server running on port ${PORT}`);
});

