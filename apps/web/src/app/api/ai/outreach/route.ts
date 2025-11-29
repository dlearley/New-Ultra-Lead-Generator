import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prospectIds, template, type } = await request.json();

    if (!prospectIds || !Array.isArray(prospectIds)) {
      return NextResponse.json(
        { error: 'Invalid prospect IDs' },
        { status: 400 }
      );
    }

    if (!template || !type) {
      return NextResponse.json(
        { error: 'Template and type are required' },
        { status: 400 }
      );
    }

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock AI outreach content based on template type
    let mockOutreach = '';

    switch (template) {
      case 'cold-email':
        mockOutreach = `Subject: Strategic Partnership Opportunity

Hi [Name],

I hope this email finds you well. I've been following [Company]'s impressive growth in the [Industry] space and wanted to reach out about a potential collaboration.

Based on recent market analysis, I believe there's significant synergy between our organizations that could drive substantial value for both parties. Specifically, I see opportunities around:

• [Value Proposition 1]
• [Value Proposition 2]  
• [Value Proposition 3]

Would you be open to a brief 15-minute call next week to explore this further? I'd be happy to share more details about how we've helped similar companies achieve [Specific Result].

Best regards,
[Your Name]
[Your Title]
[Company]`;

        break;

      case 'followup-email':
        mockOutreach = `Subject: Following up on our conversation

Hi [Name],

Hope you're having a productive week. I wanted to follow up on my previous email regarding the strategic partnership opportunity we discussed.

Given your company's focus on [Specific Area], I thought you might find this case study interesting: [Relevant Example]. They achieved [Specific Result] using a similar approach.

I'm confident we can help [Company] with [Specific Challenge]. Would you be available for a quick call this Thursday or Friday?

Looking forward to connecting.

Best regards,
[Your Name]`;

        break;

      case 'linkedin-message':
        mockOutreach = `Hi [Name] - Great to connect!

I've been really impressed with what you're building at [Company], especially your work in [Specific Area]. Your recent [Recent Achievement] caught my attention.

Given our shared interest in [Common Interest], I thought it would be valuable to connect. I'm currently working on [Your Project/Company] which focuses on [Your Focus].

Would love to learn more about your experience with [Relevant Topic] and share some insights from our side.

Looking forward to the conversation!

Best,
[Your Name]`;

        break;

      case 'linkedin-inmail':
        mockOutreach = `Hi [Name],

I hope this message finds you well. I'm reaching out because of your impressive work at [Company] and your expertise in [Specific Area].

Your background in [Relevant Experience] aligns perfectly with what we're looking for. We're currently [Current Initiative] and believe your insights could be incredibly valuable.

I'd be grateful for the opportunity to share more about how we're [Value Proposition] and learn from your experience in [Their Expertise].

Would you be open to a brief conversation?

Best regards,
[Your Name]
[Your Title]
[Company]`;

        break;

      default:
        mockOutreach = `Hi [Name],

I hope this message finds you well. I wanted to reach out regarding a potential opportunity that aligns with your background at [Company].

Based on my research, I believe there could be mutual benefit in exploring [Topic] together.

Would you be open to discussing this further?

Best regards,
[Your Name]`;
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Simulate streaming by sending chunks
          const chunks = mockOutreach.split('\n');
          
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i] + (i < chunks.length - 1 ? '\n' : '');
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
            );
            
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 30));
          }
          
          // Send completion signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('AI Outreach API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI outreach' },
      { status: 500 }
    );
  }
}