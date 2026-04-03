import { parseAndSaveJob } from './src/excelJobParser.js';

const internshipText = `Summer Internship Opportunity (2026) at National Institute of Technology Puducherry

Topic: Development of an AI-Based Video Analytics Framework for Motion Analysis and Scoring.

Required Skills
Basic knowledge of Python programming
Familiarity with Machine Learning / Deep Learning concepts
Understanding of Computer Vision (OpenCV, pose estimation models preferred)
Interest in Healthcare AI / Biomedical applications

Preferred Skills (Optional)
Experience with TensorFlow / PyTorch
Knowledge of MediaPipe / OpenPose / YOLO
Basic understanding of human biomechanics or signal processing

Duration
6–8 weeks (Flexible based on student availability) 

Mode
On-campus(4 Weeks) / Hybrid (based on feasibility for remining duration) 

Perks
Internship Certificate
Opportunity to contribute to research publication / conference paper
Hands-on experience in AI + Healthcare systems
Mentorship in research and development

Eligibility
3rd / 4th Year B.E./B.Tech (CSE, IT, ECE, Biomedical or related disciplines)

How to Apply
Interested students can send: Resume (PDF)
Brief statement of interest (max 150 words)
📧 Email: praveen.r@nitpy.ac.in, praveenram2510@gmail.com
📌 Subject: Application for Summer Internship – AI Knee Rehab Project`;

console.log('='.repeat(70));
console.log('Testing Internship Parser');
console.log('='.repeat(70));
console.log('\n📝 Parsing internship posting...\n');

parseAndSaveJob(internshipText, './output/internship_posting.xlsx')
    .then(() => {
        console.log('\n' + '='.repeat(70));
        console.log('✅ Test completed successfully!');
        console.log('='.repeat(70));
        console.log('\n📁 Check the file: ./output/internship_posting.xlsx\n');
    })
    .catch(error => {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    });

// Made with Bob
