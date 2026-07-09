import sys
import pdfplumber
import re
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# 1.Custom NLP Filter: Standard HR corporate boilerplate for better keyword analysis
CORPORATE_FILLER = {
    "experience", "preferred", "required", "seeking", "candidate", "team", 
    "join", "work", "years", "strong", "skills", "ability", "working", 
    "knowledge", "understanding", "good", "excellent", "bonus", "plus", 
    "ideal", "highly", "motivated", "role", "development", "engineer", 
    "intern", "looking", "must", "have", "requirement", "requirements", 
    "responsibilities", "track", "record", "contribute", "possesses", "core", 
    "product", "hands", "on", "proficiency", "valued", "familiarity", "solid", 
    "expected", "help", "scale", "internal", "tooling", "comfortable", 
    "designing", "building", "applications", "services", "foundation", 
    "specifically", "along", "using", "handling", "time", "extensive"
}

def clean_text(text):
    if not text:
        return ""
    text = text.lower()
    
    # 2. Tech Alias Pre-Processing: Protecting symbols before regex strips them
    text = text.replace('c++', 'cplusplus')
    text = text.replace('c#', 'csharp')
    text = text.replace('node.js', 'nodejs')
    text = text.replace('react.js', 'reactjs')
    text = text.replace('express.js', 'expressjs')
    
    # Remove non-alphanumeric characters cleanly
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_text_from_pdf(pdf_path):
    try:
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + " "
        return text
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def calculate_match(resume_text, jd_text):
    # Initializing standard English stop words and merge with our custom HR filter
    vectorizer = TfidfVectorizer(stop_words='english')
    stop_words = set(vectorizer.get_stop_words()).union(CORPORATE_FILLER)
    
    # Metric 1: Structural Cosine Similarity
    try:
        tfidf_matrix = vectorizer.fit_transform([resume_text, jd_text])
        cosine_score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0] * 100
    except Exception:
        cosine_score = 0.0

    # Metric 2: Hard Skill Overlap (Filtered)
    resume_words = set(clean_text(resume_text).split())
    jd_words = set(clean_text(jd_text).split())
    
    # Keywords that are NOT in the stop word list, and are not pure numbers
    jd_keywords = {word for word in jd_words if word not in stop_words and len(word) > 1 and not word.isnumeric()}
    
    if len(jd_keywords) == 0:
        return 0.0, []
        
    missing_skills = list(jd_keywords - resume_words)
    matched_count = len(jd_keywords) - len(missing_skills)
    
    overlap_score = (matched_count / len(jd_keywords)) * 100
    
    # 3. Industry Normalization: ATS systems know 100% overlap is impossible.
    normalized_overlap = min((overlap_score * 1.2), 100.0) 
    
    # 4. Final Hybrid Engine: 85% Technical Keyword focus, 15% Document Structure focus
    hybrid_score = (normalized_overlap * 0.85) + (cosine_score * 0.15)
    final_score = round(min(hybrid_score, 100.0), 2)
    
    # Formatting the protected aliases back to readable text for the frontend
    display_missing = [
        word.replace('cplusplus', 'C++')
            .replace('csharp', 'C#')
            .replace('nodejs', 'Node.js') 
        for word in missing_skills
    ]
    
    return final_score, display_missing[:12]

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing PDF path or Job Description"}))
        sys.exit(1)
        
    dynamic_pdf_path = sys.argv[1]
    dynamic_jd_text = sys.argv[2]
    
    try:
        raw_resume = extract_text_from_pdf(dynamic_pdf_path)
        cleaned_resume = clean_text(raw_resume)
        cleaned_jd = clean_text(dynamic_jd_text)
        
        score, missing = calculate_match(cleaned_resume, cleaned_jd)
        
        output = {
            "ats_score": score,
            "missing_keywords": missing
        }
        print(json.dumps(output))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)