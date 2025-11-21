// OpenAI client using Emergent LLM key
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.EMERGENT_LLM_KEY,
  baseURL: 'https://api.openai.com/v1'
})

export async function generateTextRecordName(content) {
  try {
    const prompt = `Generate a short, descriptive name (3-5 words max) for this text content. Only return the name, nothing else:\n\n${content.substring(0, 500)}`
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates concise, descriptive names for text content.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 20
    })
    
    return completion.choices[0].message.content.trim()
  } catch (error) {
    console.error('Error generating name:', error)
    return `Text ${new Date().toISOString().split('T')[0]}`
  }
}