import readline from 'readline';
import { smartParseAndSave } from './src/smartJobParser.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('='.repeat(70));
console.log('🤖 SMART Job Parser - AI-Powered Extraction');
console.log('='.repeat(70));
console.log('\n✨ Features:');
console.log('- Automatically detects job title, company, location');
console.log('- Extracts skills without needing bullet points');
console.log('- Handles both job postings and internships');
console.log('- Works with any format - just paste your text!');
console.log('\n📝 Instructions:');
console.log('1. Paste your job/internship posting below');
console.log('2. Press Enter after each line');
console.log('3. Type "END" on a new line when done');
console.log('4. Excel file will be auto-generated!\n');
console.log('='.repeat(70));
console.log('\n👇 Paste your text now:\n');

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
        console.log('\n❌ No text provided. Exiting...');
        process.exit(1);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🔄 Smart AI Parser analyzing your text...\n');

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const outputPath = `./output/smart_parsed_${timestamp}.xlsx`;
        
        await smartParseAndSave(jobText, outputPath);
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ SUCCESS! Excel file created with smart extraction!');
        console.log('='.repeat(70));
        console.log(`\n📁 File: ${outputPath}`);
        console.log('\n💡 The parser automatically detected and extracted all information!');
        console.log('   No manual formatting needed - just paste and go!\n');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    }
});

// Made with Bob
