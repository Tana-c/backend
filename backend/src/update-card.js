import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load interview data from data.json
const dataPath = join(__dirname, 'data.json')
const data = JSON.parse(readFileSync(dataPath, 'utf-8'))

// Use the first interview (P1) as template
const interview = data.interviews[0]

// Target card ID
const targetId = '1766124267135'

// Convert interview data to Card format
const cardData = {
  id: targetId,
  title: interview.topic,
  body: `${interview.topic}\n\n${interview.key_focus}\n\n${interview.persona.description}`,
  surveyName: interview.topic,
  target: interview.persona.description,
  topic: interview.topic,
  questionCount: interview.transcript.filter(t => t.speaker === 'Interviewer').length,
  aiModel: 'gpt-4'
}

// Also save the interview result data for Dashboard
const interviewResult = {
  id: targetId,
  segment: interview.segment,
  key_focus: interview.key_focus,
  topic: interview.topic,
  persona: interview.persona,
  transcript: interview.transcript
}

console.log('Card Data:', JSON.stringify(cardData, null, 2))
console.log('\nInterview Result Data:', JSON.stringify(interviewResult, null, 2))

// Output instructions for manual update
console.log('\n=== Instructions ===')
console.log('Copy this data to browser console:')
console.log(`
// Update card in localStorage
const cardData = ${JSON.stringify(cardData, null, 2)};
const cards = JSON.parse(localStorage.getItem('survey-cards') || '[]');
const index = cards.findIndex(c => c.id === '${targetId}');
if (index >= 0) {
  cards[index] = { ...cards[index], ...cardData };
} else {
  cards.push(cardData);
}
localStorage.setItem('survey-cards', JSON.stringify(cards));

// Save interview result
const interviewResult = ${JSON.stringify(interviewResult, null, 2)};
localStorage.setItem('interview-results-${targetId}', JSON.stringify(interviewResult));

console.log('Updated successfully!');
`)

