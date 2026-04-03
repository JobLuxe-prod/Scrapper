import { smartParseAndSave, smartParseMultiple } from './src/smartJobParser.js';

// Test with both job posting and internship
const jobPosting1 = `We are Hiring: Data Analyst (0–1 Year Experience) | Pune | Immediate Joiners

We are looking for enthusiastic and detail-oriented professionals (0–1 year experience) to join our team as Data Analysts in Pune.

Key Skills Required:
- Advanced Excel
- Pivot Tables & Charts
- Basic Power BI
- Strong attention to detail
- Data validation and accuracy

Individuals passionate about working with data and deriving insights
and can join immediately please share your resumes on "consulting-ta@dexian.com" with a subject line - Data Analyst |"Years of Experience"

📍 Location: Pune | WFO

If you're someone who enjoys working with data and wants to kickstart your career in analytics, we would love to hear from you!`;

const internshipPosting = `Summer Internship Opportunity (2026) at National Institute of Technology Puducherry

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
console.log('🤖 Testing Smart Parser with Multiple Formats');
console.log('='.repeat(70));

console.log('\n📝 Test 1: Parsing Job Posting...\n');
await smartParseAndSave(jobPosting1, './output/test_job_smart.xlsx');

console.log('\n' + '='.repeat(70));
console.log('\n📝 Test 2: Parsing Internship Posting...\n');
await smartParseAndSave(internshipPosting, './output/test_internship_smart.xlsx');

console.log('\n' + '='.repeat(70));
console.log('\n📝 Test 3: Parsing Both Together...\n');
await smartParseMultiple([jobPosting1, internshipPosting], './output/test_combined_smart.xlsx');

console.log('\n' + '='.repeat(70));
console.log('✅ All tests completed!');
console.log('='.repeat(70));
console.log('\n📁 Check these files:');
console.log('   - ./output/test_job_smart.xlsx');
console.log('   - ./output/test_internship_smart.xlsx');
console.log('   - ./output/test_combined_smart.xlsx');
console.log('\n💡 The smart parser automatically detected all fields without');
console.log('   needing specific markers or formatting!\n');

// Made with Bob
