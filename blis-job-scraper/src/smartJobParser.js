import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Smart parser that automatically detects and extracts job/internship information
 * @param {string} jobText - Raw job posting text
 * @returns {object} Parsed job information
 */
export function smartParseJobPosting(jobText) {
    const job = {
        jobTitle: '',
        company: '',
        experienceRequired: '',
        eligibility: '',
        location: '',
        workMode: '',
        duration: '',
        keySkills: [],
        perks: '',
        additionalRequirements: '',
        contactEmail: '',
        subjectLineFormat: '',
        topic: '',
        rawText: jobText
    };

    const lines = jobText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Extract job title - usually first line or contains key indicators
    const titleIndicators = ['hiring', 'opportunity', 'position', 'internship', 'job', 'opening', 'vacancy'];
    for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i].toLowerCase();
        if (titleIndicators.some(indicator => line.includes(indicator)) || i === 0) {
            // Clean up the title
            let title = lines[i]
                .replace(/^(we are |now )?hiring:?/i, '')
                .replace(/^(summer |winter )?internship:?/i, 'Internship')
                .replace(/^opportunity:?/i, '')
                .trim();
            
            // Extract year if present
            const yearMatch = title.match(/\((\d{4})\)/);
            if (yearMatch) {
                title = title.replace(/\(\d{4}\)/, '').trim();
            }
            
            if (title.length > 5 && title.length < 150) {
                job.jobTitle = title;
                break;
            }
        }
    }

    // Extract company/organization - look for "at" pattern
    const companyPatterns = [
        /(?:at|@)\s+([A-Z][A-Za-z\s&,.\-()]+?)(?:\n|$)/,
        /(?:company|organization|institute|university)[\s:]+([A-Z][A-Za-z\s&,.\-()]+?)(?:\n|$)/i
    ];
    for (const pattern of companyPatterns) {
        const match = jobText.match(pattern);
        if (match) {
            job.company = match[1].trim();
            break;
        }
    }

    // Extract topic/project (common in research/internships)
    const topicMatch = jobText.match(/(?:topic|project|research area)[\s:]+([^\n]+)/i);
    if (topicMatch) {
        job.topic = topicMatch[1].trim();
    }

    // Extract experience - flexible patterns
    const expPatterns = [
        /(\d+[-–]\d+)\s*(?:year|yr)s?\s*(?:of\s*)?(?:experience|exp)?/i,
        /(\d+)\+?\s*(?:year|yr)s?\s*(?:of\s*)?(?:experience|exp)?/i,
        /(?:experience|exp)[\s:]+(\d+[-–]\d+)\s*(?:year|yr)s?/i
    ];
    for (const pattern of expPatterns) {
        const match = jobText.match(pattern);
        if (match) {
            job.experienceRequired = match[1] + ' Years';
            break;
        }
    }

    // Extract eligibility - look for academic requirements
    const eligibilityPatterns = [
        /(?:eligibility|eligible|qualification)[\s:]*\n?([\s\S]{0,300}?)(?=\n\n|how to apply|duration|mode|perks|$)/i,
        /(\d+(?:st|nd|rd|th)\s*\/?\s*\d+(?:st|nd|rd|th)?\s*year\s+[A-Z][A-Za-z\s\/,.\-()]+)/i
    ];
    for (const pattern of eligibilityPatterns) {
        const match = jobText.match(pattern);
        if (match) {
            job.eligibility = match[1].trim().replace(/\n+/g, ' ').substring(0, 250);
            break;
        }
    }

    // Extract location - smart detection
    const locationPatterns = [
        /(?:location|based in|office in)[\s:]+([A-Za-z\s,]+?)(?:\s*\||$|\n)/i,
        /📍\s*([A-Za-z\s,]+?)(?:\s*\||$|\n)/,
        /\|\s*([A-Za-z\s,]+?)\s*\|/,
        /(?:^|\n)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\|/m
    ];
    for (const pattern of locationPatterns) {
        const match = jobText.match(pattern);
        if (match) {
            const loc = match[1].trim();
            // Validate it's a real location (not a random word)
            if (loc.length > 2 && loc.length < 50 && !loc.match(/^(WFO|WFH|Hybrid|Remote)$/i)) {
                job.location = loc;
                break;
            }
        }
    }

    // Extract work mode - comprehensive patterns
    const workModePatterns = [
        /(?:mode|work mode|working mode)[\s:]*\n?([^\n]+)/i,
        /\b(work from office|work from home|on-campus|off-campus|hybrid|remote|wfo|wfh)\b/i,
        /\b(on-?site|off-?site)\b/i
    ];
    for (const pattern of workModePatterns) {
        const match = jobText.match(pattern);
        if (match) {
            job.workMode = match[1].trim();
            break;
        }
    }

    // Extract duration
    const durationPatterns = [
        /(?:duration|period|tenure)[\s:]*\n?([^\n]+)/i,
        /(\d+[-–]\d+\s*(?:weeks?|months?|years?))/i
    ];
    for (const pattern of durationPatterns) {
        const match = jobText.match(pattern);
        if (match) {
            job.duration = match[1].trim();
            break;
        }
    }

    // Extract skills - smart detection of bullet points and lists
    const skillsSections = [
        /(?:required skills?|skills? required|key skills?|technical skills?)[\s:]*\n?([\s\S]{0,800}?)(?=\n\n|preferred|duration|mode|perks|eligibility|how to apply|$)/i,
        /(?:must have|requirements?)[\s:]*\n?([\s\S]{0,500}?)(?=\n\n|preferred|nice to have|$)/i
    ];
    
    for (const pattern of skillsSections) {
        const match = jobText.match(pattern);
        if (match) {
            const skillsText = match[1];
            
            // Extract bullet points
            const bulletSkills = skillsText.match(/[-•*]\s*([^\n]+)/g);
            if (bulletSkills && bulletSkills.length > 0) {
                job.keySkills = bulletSkills.map(skill => 
                    skill.replace(/^[-•*]\s*/, '').trim()
                ).filter(skill => skill.length > 2 && skill.length < 200);
                break;
            }
            
            // Try numbered lists
            const numberedSkills = skillsText.match(/\d+\.\s*([^\n]+)/g);
            if (numberedSkills && numberedSkills.length > 0) {
                job.keySkills = numberedSkills.map(skill => 
                    skill.replace(/^\d+\.\s*/, '').trim()
                ).filter(skill => skill.length > 2 && skill.length < 200);
                break;
            }
            
            // Try line-by-line if no bullets
            const skillLines = skillsText.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 5 && line.length < 200 && !line.match(/^(preferred|optional|nice)/i));
            if (skillLines.length > 0 && skillLines.length < 20) {
                job.keySkills = skillLines;
                break;
            }
        }
    }

    // Extract perks/benefits
    const perksPatterns = [
        /(?:perks?|benefits?|what (?:you|we) offer)[\s:]*\n?([\s\S]{0,500}?)(?=\n\n|eligibility|how to apply|$)/i
    ];
    for (const pattern of perksPatterns) {
        const match = jobText.match(pattern);
        if (match) {
            const perksText = match[1].trim();
            // Extract bullet points or clean text
            const bulletPerks = perksText.match(/[-•*]\s*([^\n]+)/g);
            if (bulletPerks) {
                job.perks = bulletPerks.map(p => p.replace(/^[-•*]\s*/, '').trim()).join('; ');
            } else {
                job.perks = perksText.replace(/\n+/g, ' ').substring(0, 300);
            }
            break;
        }
    }

    // Extract all emails
    const emailMatches = jobText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g);
    if (emailMatches) {
        job.contactEmail = [...new Set(emailMatches)].join(', ');
    }

    // Extract subject line format
    const subjectPatterns = [
        /(?:subject|subject line?)[\s:]*[-–]\s*([^\n]+)/i,
        /(?:email subject|mail subject)[\s:]+([^\n]+)/i
    ];
    for (const pattern of subjectPatterns) {
        const match = jobText.match(pattern);
        if (match) {
            job.subjectLineFormat = match[1].trim().replace(/["""]/g, '"');
            break;
        }
    }

    // Extract additional requirements/description
    const descPatterns = [
        /(?:we are looking for|description|about (?:the )?(?:role|position))[\s:]*\n?([\s\S]{0,400}?)(?=\n\n|key skills|required skills|how to apply|$)/i,
        /(?:responsibilities|duties)[\s:]*\n?([\s\S]{0,400}?)(?=\n\n|key skills|required skills|$)/i
    ];
    for (const pattern of descPatterns) {
        const match = jobText.match(pattern);
        if (match) {
            job.additionalRequirements = match[1].trim().replace(/\n+/g, ' ').substring(0, 400);
            break;
        }
    }

    return job;
}

/**
 * Create Excel file from parsed jobs
 */
export async function createExcelFile(jobs, outputPath) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Job Postings');

    worksheet.columns = [
        { header: 'Job Title', key: 'jobTitle', width: 40 },
        { header: 'Company/Organization', key: 'company', width: 30 },
        { header: 'Topic/Project', key: 'topic', width: 40 },
        { header: 'Experience Required', key: 'experienceRequired', width: 20 },
        { header: 'Eligibility', key: 'eligibility', width: 35 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Work Mode', key: 'workMode', width: 25 },
        { header: 'Duration', key: 'duration', width: 25 },
        { header: 'Key Skills', key: 'keySkills', width: 60 },
        { header: 'Perks/Benefits', key: 'perks', width: 40 },
        { header: 'Additional Info', key: 'additionalRequirements', width: 45 },
        { header: 'Contact Email', key: 'contactEmail', width: 40 },
        { header: 'Subject Line Format', key: 'subjectLineFormat', width: 45 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data
    jobs.forEach(job => {
        worksheet.addRow({
            jobTitle: job.jobTitle,
            company: job.company,
            topic: job.topic,
            experienceRequired: job.experienceRequired,
            eligibility: job.eligibility,
            location: job.location,
            workMode: job.workMode,
            duration: job.duration,
            keySkills: job.keySkills.join('\n'),
            perks: job.perks,
            additionalRequirements: job.additionalRequirements,
            contactEmail: job.contactEmail,
            subjectLineFormat: job.subjectLineFormat
        });
    });

    // Apply styling
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

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(outputPath);
}

/**
 * Smart parse and save
 */
export async function smartParseAndSave(jobText, outputPath = null) {
    const job = smartParseJobPosting(jobText);
    
    if (!outputPath) {
        outputPath = path.join(__dirname, '../output', `smart_job_${Date.now()}.xlsx`);
    }

    await createExcelFile([job], outputPath);
    
    console.log(`✅ Smart parsing complete! File saved to: ${outputPath}`);
    console.log('\n📊 Extracted Information:');
    console.log(`- Job Title: ${job.jobTitle || 'N/A'}`);
    console.log(`- Company: ${job.company || 'N/A'}`);
    console.log(`- Topic: ${job.topic || 'N/A'}`);
    console.log(`- Experience: ${job.experienceRequired || 'N/A'}`);
    console.log(`- Eligibility: ${job.eligibility || 'N/A'}`);
    console.log(`- Location: ${job.location || 'N/A'}`);
    console.log(`- Work Mode: ${job.workMode || 'N/A'}`);
    console.log(`- Duration: ${job.duration || 'N/A'}`);
    console.log(`- Skills: ${job.keySkills.length} skills found`);
    console.log(`- Contact: ${job.contactEmail || 'N/A'}`);
    
    return job;
}

export async function smartParseMultiple(jobTexts, outputPath = null) {
    const jobs = jobTexts.map(text => smartParseJobPosting(text));
    
    if (!outputPath) {
        outputPath = path.join(__dirname, '../output', `smart_jobs_${Date.now()}.xlsx`);
    }

    await createExcelFile(jobs, outputPath);
    console.log(`✅ ${jobs.length} job(s) parsed and saved to: ${outputPath}`);
    
    return jobs;
}

// Made with Bob
