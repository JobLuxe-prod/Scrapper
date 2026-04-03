const fs = require('fs');
const path = require('path');

/**
 * Parse job posting text and extract structured information
 * @param {string} jobText - Raw job posting text
 * @returns {object} Parsed job information
 */
function parseJobPosting(jobText) {
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
        rawText: jobText
    };

    // Extract job title from first line or "We are Hiring:" pattern
    const titleMatch = jobText.match(/(?:We are Hiring:|Hiring for|Position:)\s*([^\n|]+?)(?:\s*\||$)/i);
    if (titleMatch) {
        job.jobTitle = titleMatch[1].trim();
    }

    // Extract experience
    const expMatch = jobText.match(/(\d+[-–]\d+\s*(?:Year|Yr)s?\s*(?:Experience|Exp)?)/i);
    if (expMatch) {
        job.experienceRequired = expMatch[1].trim();
    }

    // Extract location
    const locationMatch = jobText.match(/(?:Location:|📍\s*Location:|\|)\s*([A-Za-z\s,]+?)(?:\s*\||WFO|WFH|Hybrid|$)/i);
    if (locationMatch) {
        job.location = locationMatch[1].trim();
    }

    // Extract work mode
    const workModeMatch = jobText.match(/\b(WFO|WFH|Hybrid|Work From Office|Work From Home|Remote)\b/i);
    if (workModeMatch) {
        job.workMode = workModeMatch[1].trim();
    }

    // Extract key skills (look for bullet points or comma-separated list)
    const skillsSection = jobText.match(/(?:Key Skills Required:|Skills Required:|Required Skills:)([\s\S]*?)(?=\n\n|Individuals|Location:|$)/i);
    if (skillsSection) {
        const skillsText = skillsSection[1];
        // Extract bullet points
        const bulletSkills = skillsText.match(/[-•]\s*([^\n]+)/g);
        if (bulletSkills) {
            job.keySkills = bulletSkills.map(skill => skill.replace(/^[-•]\s*/, '').trim());
        }
    }

    // Extract email
    const emailMatch = jobText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    if (emailMatch) {
        job.contactEmail = emailMatch[1];
    }

    // Extract subject line format
    const subjectMatch = jobText.match(/subject line\s*[-:]\s*([^\n]+)/i);
    if (subjectMatch) {
        job.subjectLineFormat = subjectMatch[1].trim().replace(/["""]/g, '"');
    }

    // Extract additional requirements
    const reqMatch = jobText.match(/(?:We are looking for|Requirements?:|Qualifications?:)([\s\S]*?)(?=Key Skills|Location:|$)/i);
    if (reqMatch) {
        job.additionalRequirements = reqMatch[1].trim().replace(/\n+/g, ' ').substring(0, 200);
    }

    return job;
}

/**
 * Convert parsed jobs to CSV format
 * @param {Array} jobs - Array of parsed job objects
 * @returns {string} CSV formatted string
 */
function jobsToCSV(jobs) {
    const headers = [
        'Job Title',
        'Experience Required',
        'Location',
        'Work Mode',
        'Key Skills',
        'Additional Requirements',
        'Contact Email',
        'Subject Line Format',
        'Company'
    ];

    const rows = jobs.map(job => [
        job.jobTitle,
        job.experienceRequired,
        job.location,
        job.workMode,
        job.keySkills.join(', '),
        job.additionalRequirements,
        job.contactEmail,
        job.subjectLineFormat,
        job.company
    ]);

    // Escape fields that contain commas or quotes
    const escapeField = (field) => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    };

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeField).join(','))
    ].join('\n');

    return csvContent;
}

/**
 * Parse job posting text and save to CSV
 * @param {string} jobText - Raw job posting text
 * @param {string} outputPath - Path to save CSV file
 */
function parseAndSaveJob(jobText, outputPath = null) {
    const job = parseJobPosting(jobText);
    
    if (!outputPath) {
        outputPath = path.join(__dirname, '../output', `job_posting_${Date.now()}.csv`);
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const csv = jobsToCSV([job]);
    fs.writeFileSync(outputPath, csv, 'utf8');
    
    console.log(`✅ Job posting parsed and saved to: ${outputPath}`);
    console.log('\nParsed Information:');
    console.log(`- Job Title: ${job.jobTitle}`);
    console.log(`- Experience: ${job.experienceRequired}`);
    console.log(`- Location: ${job.location}`);
    console.log(`- Work Mode: ${job.workMode}`);
    console.log(`- Skills: ${job.keySkills.join(', ')}`);
    console.log(`- Contact: ${job.contactEmail}`);
    
    return job;
}

/**
 * Parse multiple job postings and save to CSV
 * @param {Array<string>} jobTexts - Array of raw job posting texts
 * @param {string} outputPath - Path to save CSV file
 */
function parseAndSaveMultipleJobs(jobTexts, outputPath = null) {
    const jobs = jobTexts.map(text => parseJobPosting(text));
    
    if (!outputPath) {
        outputPath = path.join(__dirname, '../output', `jobs_${Date.now()}.csv`);
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const csv = jobsToCSV(jobs);
    fs.writeFileSync(outputPath, csv, 'utf8');
    
    console.log(`✅ ${jobs.length} job posting(s) parsed and saved to: ${outputPath}`);
    
    return jobs;
}

module.exports = {
    parseJobPosting,
    jobsToCSV,
    parseAndSaveJob,
    parseAndSaveMultipleJobs
};

// Made with Bob
