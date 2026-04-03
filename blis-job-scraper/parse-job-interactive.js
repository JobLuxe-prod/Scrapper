import readline from 'readline';
import { parseAndSaveJob } from './src/excelJobParser.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('='.repeat(70));
console.log('📋 Job Posting Parser - Interactive Mode');
console.log('='.repeat(70));
console.log('\n📝 Instructions:');
console.log('1. Paste your job posting text below');
console.log('2. Press Enter');
console.log('3. Type "END" on a new line and press Enter to finish');
console.log('4. The Excel file will be created in the output folder\n');
console.log('='.repeat(70));
console.log('\nPaste your job posting text now:\n');

let jobText = '';
let lineCount = 0;

rl.on('line', (line) => {
    if (line.trim().toUpperCase() === 'END') {
        rl.close();
    } else {
        if (lineCount > 0) {
            jobText += '\n';
        }
        jobText += line;
        lineCount++;
    }
});

rl.on('close', async () => {
    if (jobText.trim().length === 0) {
        console.log('\n❌ No job posting text provided. Exiting...');
        process.exit(1);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🔄 Processing your job posting...\n');

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const outputPath = `./output/job_posting_${timestamp}.xlsx`;
        
        await parseAndSaveJob(jobText, outputPath);
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ SUCCESS! Excel file created successfully!');
        console.log('='.repeat(70));
        console.log(`\n📁 File location: ${outputPath}`);
        console.log('\n💡 You can now open this file in Excel to view the parsed data.\n');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.message.includes('Cannot find module')) {
            console.log('\n💡 Please install required dependencies first:');
            console.log('   npm install exceljs\n');
        }
    }
});

// Made with Bob
