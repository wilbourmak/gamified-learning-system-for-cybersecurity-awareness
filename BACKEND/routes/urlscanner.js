const express = require('express');
const router = express.Router();
const ScannedURL = require('../models/ScannedURL');
const { auth } = require('../middleware/auth');

// Analyze URL and check if it's safe (simulated analysis)
function analyzeURL(url) {
    const maliciousPatterns = [
        { pattern: /bit\.ly|tinyurl|t\.co|ow\.ly/i, type: 'suspicious', reason: 'URL shortener detected' },
        { pattern: /login|signin|verify|secure|account|update/i, type: 'phishing', reason: 'Phishing keywords detected' },
        { pattern: /\.xyz|\.tk|\.ml|\.ga|\.cf/i, type: 'suspicious', reason: 'Suspicious TLD detected' },
        { pattern: /paypal.*\.com|amazon.*\.com|bank.*\.com/i, type: 'phishing', reason: 'Brand impersonation detected' },
        { pattern: /download|exe|zip|dmg|apk/i, type: 'malware', reason: 'Potential malware download' },
        { pattern: /free|prize|winner|lottery|click.*here/i, type: 'spam', reason: 'Spam keywords detected' }
    ];

    let riskScore = 0;
    let threats = [];
    let isSafe = true;

    // Check for http vs https
    if (url.startsWith('http://') && !url.includes('localhost')) {
        riskScore += 20;
        threats.push('Unsecured HTTP connection');
    }

    // Check for malicious patterns
    for (const check of maliciousPatterns) {
        if (check.pattern.test(url)) {
            riskScore += 25;
            threats.push(check.reason);
            if (check.type === 'phishing' || check.type === 'malware') {
                isSafe = false;
            }
        }
    }

    // Check for IP address in URL
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
        riskScore += 30;
        threats.push('IP address instead of domain name');
        isSafe = false;
    }

    // Check for excessive subdomains
    const subdomainCount = (url.match(/\./g) || []).length;
    if (subdomainCount > 3) {
        riskScore += 15;
        threats.push('Excessive subdomains');
    }

    // Determine threat type
    let threatType = 'none';
    if (!isSafe || riskScore > 50) {
        if (threats.some(t => t.includes('Phishing') || t.includes('login') || t.includes('verify'))) {
            threatType = 'phishing';
        } else if (threats.some(t => t.includes('malware') || t.includes('download'))) {
            threatType = 'malware';
        } else if (threats.some(t => t.includes('Spam') || t.includes('prize'))) {
            threatType = 'spam';
        } else {
            threatType = 'suspicious';
        }
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);

    return {
        isSafe: riskScore < 40,
        threatType: threatType,
        riskScore: riskScore,
        details: threats.length > 0 ? threats.join('. ') : 'No obvious threats detected'
    };
}

// Scan a URL
router.post('/scan', auth, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, message: 'URL is required' });
        }

        // Validate URL format
        let validatedUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            validatedUrl = 'https://' + url;
        }

        // Analyze the URL
        const analysis = analyzeURL(validatedUrl);

        // Save to database
        const scannedURL = new ScannedURL({
            userId: req.user.userId,
            url: validatedUrl,
            isSafe: analysis.isSafe,
            threatType: analysis.threatType,
            riskScore: analysis.riskScore,
            details: analysis.details
        });

        await scannedURL.save();

        // Return results
        res.json({
            success: true,
            result: {
                url: validatedUrl,
                isSafe: analysis.isSafe,
                threatType: analysis.threatType,
                riskScore: analysis.riskScore,
                details: analysis.details,
                scannedAt: scannedURL.scannedAt
            }
        });
    } catch (error) {
        console.error('URL Scan Error:', error);
        res.status(500).json({ success: false, message: 'Failed to scan URL' });
    }
});

// Get user's scanned URL history
router.get('/history', auth, async (req, res) => {
    try {
        const scans = await ScannedURL.find({ userId: req.user.userId })
            .sort({ scannedAt: -1 })
            .limit(50);

        res.json({
            success: true,
            scans: scans
        });
    } catch (error) {
        console.error('Get History Error:', error);
        res.status(500).json({ success: false, message: 'Failed to get scan history' });
    }
});

// Get user's scan statistics
router.get('/stats', auth, async (req, res) => {
    try {
        const totalScans = await ScannedURL.countDocuments({ userId: req.user.userId });
        const safeUrls = await ScannedURL.countDocuments({ userId: req.user.userId, isSafe: true });
        const maliciousUrls = await ScannedURL.countDocuments({ userId: req.user.userId, isSafe: false });

        res.json({
            success: true,
            stats: {
                totalScans,
                safeUrls,
                maliciousUrls,
                accuracy: totalScans > 0 ? Math.round((safeUrls / totalScans) * 100) : 0
            }
        });
    } catch (error) {
        console.error('Get Stats Error:', error);
        res.status(500).json({ success: false, message: 'Failed to get stats' });
    }
});

module.exports = router;
