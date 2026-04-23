import Anthropic from '@anthropic-ai/sdk'

export async function POST(request) {
  try {
    const { prompt, apiKey } = await request.json()
    
    const client = new Anthropic({ apiKey })
    
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
    
    return Response.json({ text: message.content[0].text })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
