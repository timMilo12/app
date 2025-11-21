// AI naming using Emergent LLM key
export async function generateTextRecordName(content) {
  try {
    // Dynamically import emergent integrations (Python module)
    const { spawn } = await import('child_process')
    
    const prompt = `Generate a short, descriptive name (3-5 words max) for this text content. Only return the name, nothing else:\n\n${content.substring(0, 500)}`
    
    // Use a simple Python script to call emergentintegrations
    return new Promise((resolve, reject) => {
      const python = spawn('python3', ['-c', `
import sys
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage

try:
    chat = LlmChat(
        api_key="${process.env.EMERGENT_LLM_KEY}",
        session_id="naming_session",
        system_message="You are a helpful assistant that creates concise, descriptive names for text content. Return only the name, nothing else."
    )
    chat.with_model("openai", "gpt-4o-mini")
    
    user_msg = UserMessage(text="""${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}""")
    response = chat.send_message(user_msg)
    print(response.strip())
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`])
      
      let output = ''
      let error = ''
      
      python.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      python.stderr.on('data', (data) => {
        error += data.toString()
      })
      
      python.on('close', (code) => {
        if (code !== 0) {
          console.error('Python error:', error)
          resolve(`Text ${new Date().toISOString().split('T')[0]}`)
        } else {
          resolve(output.trim() || `Text ${new Date().toISOString().split('T')[0]}`)
        }
      })
    })
  } catch (error) {
    console.error('Error generating name:', error)
    return `Text ${new Date().toISOString().split('T')[0]}`
  }
}