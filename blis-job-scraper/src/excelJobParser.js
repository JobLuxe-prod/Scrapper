import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse job posting text and extract structured information
 * @param {string} jobText - Raw job posting text
 * @returns {object} Parsed job information
 */
export function parseJobPosting(jobText) {
    const job = {
        jobTitle: '',
        experienceRequired: '',
        location: '',
        workMode: '',
        keySkills: [],
        additionalRequirements: '',
        contactEmail: '',
        subjectLineFormat: '',
        company: '',
        duration: '',
        eligibility: '',
        perks: '',
        rawText: jobText
    };

    // Extract job title - multiple patterns
    let titleMatch = jobText.match(/(?:We are Hiring:|Hiring for|Position:|Opportunity|Internship)\s*[:\-]?\s*([^\n|]+?)(?:\s*\(|\s*\||at|$)/i);
    if (titleMatch) {
        job.jobTitle = titleMatch[1].trim();
    } else {
        // Try first line as title
        const firstLine = jobText.split('\n')[0].trim();
        if (firstLine.length > 0 && firstLine.length < 100) {
            job.jobTitle = firstLine;
        }
    }

    // Extract company/organization
    const companyMatch = jobText.match(/(?:at|@)\s+([A-Z][A-Za-z\s&,.-]+?)(?:\n|$)/);
    if (companyMatch) {
        job.company = companyMatch[1].trim();
    }

    // Extract experience or eligibility
    const expMatch = jobText.match(/(\d+[-–]\d+\s*(?:Year|Yr)s?\s*(?:Experience|Exp)?)/i);
    if (expMatch) {
        job.experienceRequired = expMatch[1].trim();
    }
    
    // Extract eligibility (for internships/academic positions)
    const eligibilityMatch = jobText.match(/(?:Eligibility|Eligible|Requirements?)[\s:]*\n?([\s\S]*?)(?=\n\n|How to Apply|Duration|Mode|$)/i);
    if (eligibilityMatch) {
        job.eligibility = eligibilityMatch[1].trim().replace(/\n+/g, ' ').substring(0, 200);
    }

    // Extract duration (for internships)
    const durationMatch = jobText.match(/(?:Duration|Period)[\s:]*\n?([^\n]+)/i);
    if (durationMatch) {
        job.duration = durationMatch[1].trim();
    }

    // Extract location
    const locationMatch = jobText.match(/(?:Location:|📍\s*Location:|\|)\s*([A-Za-z\s,]+?)(?:\s*\||WFO|WFH|Hybrid|Immediate|$)/i);
    if (locationMatch) {
        job.location = locationMatch[1].trim();
    }

    // Extract work mode
    const workModeMatch = jobText.match(/(?:Mode|Work Mode)[\s:]*\n?([^\n]+)|(?:\b(WFO|WFH|Hybrid|Work From Office|Work From Home|Remote|On-campus)\b)/i);
    if (workModeMatch) {
        job.workMode = (workModeMatch[1] || workModeMatch[2]).trim();
    }

    // Extract key skills (look for bullet points or comma-separated list)
    const skillsSection = jobText.match(/(?:Key Skills|Skills Required|Required Skills|Skills)[\s:]*\n?([\s\S]*?)(?=\n\n|Preferred|Duration|Mode|Perks|Eligibility|How to Apply|$)/i);
    if (skillsSection) {
        const skillsText = skillsSection[1];
        // Extract bullet points
        const bulletSkills = skillsText.match(/[-•]\s*([^\n]+)/g);
        if (bulletSkills) {
            job.keySkills = bulletSkills.map(skill => skill.replace(/^[-•]\s*/, '').trim());
        }
    }

    // Extract perks/benefits
    const perksMatch = jobText.match(/(?:Perks|Benefits)[\s:]*\n?([\s\S]*?)(?=\n\n|Eligibility|How to Apply|$)/i);
    if (perksMatch) {
        job.perks = perksMatch[1].trim().replace(/\n+/g, ' ').substring(0, 200);
    }

    // Extract email (can be multiple)
    const emailMatches = jobText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g);
    if (emailMatches) {
        job.contactEmail = emailMatches.join(', ');
    }

    // Extract subject line format
    const subjectMatch = jobText.match(/(?:subject|Subject line?)[\s:]*[-–]\s*([^\n]+)/i);
    if (subjectMatch) {
        job.subjectLineFormat = subjectMatch[1].trim().replace(/["""]/g, '"');
    }

    // Extract additional requirements
    const reqMatch = jobText.match(/(?:We are looking for|Requirements?:|Qualifications?:)([\s\S]*?)(?=Key Skills|Location:|$)/i);
    if (reqMatch) {
        job.additionalRequirements = reqMatch[1].trim().replace(/\n+/g, ' ').substring(0, 300);
    }

    return job;
}

/**
 * Create Excel file from parsed jobs
 * @param {Array} jobs - Array of parsed job objects
 * @param {string} outputPath - Path to save Excel file
 */
export async function createExcelFile(jobs, outputPath) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Job Postings');

    // Define columns
    worksheet.columns = [
        { header: 'Job Title', key: 'jobTitle', width: 35 },
        { header: 'Company/Organization', key: 'company', width: 25 },
        { header: 'Experience Required', key: 'experienceRequired', width: 20 },
        { header: 'Eligibility', key: 'eligibility', width: 30 },
        { header: 'Location', key: 'location', width: 15 },
        { header: 'Work Mode', key: 'workMode', width: 20 },
        { header: 'Duration', key: 'duration', width: 20 },
        { header: 'Key Skills', key: 'keySkills', width: 50 },
        { header: 'Perks/Benefits', key: 'perks', width: 35 },
        { header: 'Additional Requirements', key: 'additionalRequirements', width: 40 },
        { header: 'Contact Email', key: 'contactEmail', width: 35 },
        { header: 'Subject Line Format', key: 'subjectLineFormat', width: 40 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    jobs.forEach(job => {
        worksheet.addRow({
            jobTitle: job.jobTitle,
            company: job.company,
            experienceRequired: job.experienceRequired,
            eligibility: job.eligibility,
            location: job.location,
            workMode: job.workMode,
            duration: job.duration,
            keySkills: job.keySkills.join(', '),
            perks: job.perks,
            additionalRequirements: job.additionalRequirements,
            contactEmail: job.contactEmail,
            subjectLineFormat: job.subjectLineFormat
        });
    });

    // Apply borders and alignment to all cells
    worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            if (rowNumber > 1) {
                cell.alignment = { vertical: 'top', wrapText: true };
            }
        });
    });

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save the file
    await workbook.xlsx.writeFile(outputPath);
}

/**
 * Parse job posting text and save to Excel
 * @param {string} jobText - Raw job posting text
 * @param {string} outputPath - Path to save Excel file
 */
export async function parseAndSaveJob(jobText, outputPath = null) {
    const job = parseJobPosting(jobText);
    
    if (!outputPath) {
        outputPath = path.join(__dirname, '../output', `job_posting_${Date.now()}.xlsx`);
    }

    await createExcelFile([job], outputPath);
    
    console.log(`✅ Job posting parsed and saved to: ${outputPath}`);
    console.log('\nParsed Information:');
    console.log(`- Job Title: ${job.jobTitle}`);
    console.log(`- Company: ${job.company}`);
    console.log(`- Experience: ${job.experienceRequired}`);
    console.log(`- Eligibility: ${job.eligibility}`);
    console.log(`- Location: ${job.location}`);
    console.log(`- Work Mode: ${job.workMode}`);
    console.log(`- Duration: ${job.duration}`);
    console.log(`- Skills: ${job.keySkills.join(', ')}`);
    console.log(`- Perks: ${job.perks}`);
    console.log(`- Contact: ${job.contactEmail}`);
    
    return job;
}

/**
 * Parse multiple job postings and save to Excel
 * @param {Array<string>} jobTexts - Array of raw job posting texts
 * @param {string} outputPath - Path to save Excel file
 */
export async function parseAndSaveMultipleJobs(jobTexts, outputPath = null) {
    const jobs = jobTexts.map(text => parseJobPosting(text));
    
    if (!outputPath) {
        outputPath = path.join(__dirname, '../output', `jobs_${Date.now()}.xlsx`);
    }

    await createExcelFile(jobs, outputPath);
    
    console.log(`✅ ${jobs.length} job posting(s) parsed and saved to: ${outputPath}`);
    
    return jobs;
}

// Made with Bob
