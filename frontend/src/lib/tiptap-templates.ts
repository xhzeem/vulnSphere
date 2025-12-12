// Predefined HTML templates for TipTap editor

export const TIPTAP_TEMPLATES = {
  // New vulnerability template
  NEW_VULNERABILITY: `<h1>Vulnerability Details</h1>
<h2>Description</h2>
<p><em>Provide a detailed description of the vulnerability</em></p>
<h2>Impact</h2>
<p><em>Describe the potential impact and consequences</em></p>
<h2>Steps to Reproduce</h2>
<ol>
<li><em>Step 1: Describe the first step</em></li>
<li><em>Step 2: Describe the second step</em></li>
<li><em>Step 3: Describe the third step</em></li>
</ol>
<h2>Proof of Concept</h2>
<p><em>Include any proof of concept, screenshots, or examples</em></p>
<h2>Remediation</h2>
<p><em>Provide recommendations for fixing the vulnerability</em></p>`,

  // New retest template
  NEW_RETEST: `Vulnerability is fixed!`,

  // Empty template for templates
  EMPTY_TEMPLATE: `<h1>Template Details</h1>
<h2>Description</h2>
<p><em>Provide a detailed description of the vulnerability</em></p>
<h2>Impact</h2>
<p><em>Describe the potential impact and consequences</em></p>
<h2>Steps to Reproduce</h2>
<ol>
<li><em>Step 1: Describe the first step</em></li>
<li><em>Step 2: Describe the second step</em></li>
<li><em>Step 3: Describe the third step</em></li>
</ol>
<h2>Proof of Concept</h2>
<p><em>Include any proof of concept, screenshots, or examples</em></p>
<h2>Remediation</h2>
<p><em>Provide recommendations for fixing the vulnerability</em></p>`
}

// Helper function to get template by type
export const getTemplate = (type: keyof typeof TIPTAP_TEMPLATES): string => {
  return TIPTAP_TEMPLATES[type] || TIPTAP_TEMPLATES.EMPTY_TEMPLATE
}
