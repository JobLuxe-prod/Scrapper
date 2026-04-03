import { parseAndSaveJob, parseAndSaveMultipleJobs } from './src/excelJobParser.js';

// Example usage with the sample job posting
const sampleJobText = `We are Hiring: Data Analyst (0–1 Year Experience) | Pune | Immediate Joiners

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

console.log('='.repeat(60));
console.log('Job Text Parser - Excel Output');
console.log('='.repeat(60));
console.log('\n📝 Parsing job posting and creating Excel file...\n');

// Parse and save the job posting to Excel
parseAndSaveJob(sampleJobText, './output/job_posting.xlsx')
    .then(() => {
        console.log('\n' + '='.repeat(60));
        console.log('\n💡 How to use this parser:\n');
        console.log('1. For a single job posting:');
        console.log('   import { parseAndSaveJob } from "./src/excelJobParser.js";');
        console.log('   await parseAndSaveJob(yourJobText);\n');
        console.log('2. For multiple job postings:');
        console.log('   import { parseAndSaveMultipleJobs } from "./src/excelJobParser.js";');
        console.log('   await parseAndSaveMultipleJobs([jobText1, jobText2, jobText3]);\n');
        console.log('3. Custom output path:');
        console.log('   await parseAndSaveJob(jobText, "./output/my-jobs.xlsx");\n');
        console.log('4. Simply paste your job posting text and run:');
        console.log('   node parse-job-excel.js\n');
        console.log('='.repeat(60));
    })
    .catch(error => {
        console.error('❌ Error:', error.message);
        if (error.message.includes('Cannot find module')) {
            console.log('\n💡 Please install required dependencies:');
            console.log('   npm install exceljs');
        }
    });

// Made with Bob
