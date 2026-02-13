Prompt engineering for Claude focuses on clarity, structure, and guidance to maximize output quality, often reducing the need for iterations.

Unlike more rigid frameworks, Anthropic's approach is flexible, prioritizing explicitness over inference. Not all elements are required for every prompt—start with core instructions and add layers for complexity. Recent updates in 2026 highlight better state tracking across context windows, proactive tool parallelism, and reflection after tool results.

Here's an updated 10-step framework, synthesized from Anthropic's official prompt engineering documentation and recent community insights. It adapts classic techniques to Claude 4.5's strengths, incorporating XML tags for control, chain-of-thought for reasoning, and agentic patterns.

1\. \*\*Task Context (Define role and objective)\*\*    
   Assign Claude a specific identity or role to set expectations. Include the model version if using API (e.g., "claude-sonnet-4-5-20250929"). State the high-level goal explicitly, including motivation for better alignment.    
   \*Example:\* "You are an expert data scientist using Claude Opus 4.5. Your goal is to analyze sales trends to inform inventory decisions—focus on actionable insights to reduce overstock."

2\. \*\*Tone and Style Context (Specify communication approach)\*\*    
   Define the response style to match user needs: concise, conversational, or detailed. Claude 4.5 is more direct and less verbose by default, so guide it away from excessive markdown unless needed.    
   \*Example:\* "Use a professional, flowing prose style without bold text or lists unless listing discrete items. Be concise yet thorough."

3\. \*\*Background Data (Provide foundational information)\*\*    
   Supply relevant context, data, files, or links. For multimodal tasks, reference images or use vision tools. Claude 4.5 handles large contexts well, so include details upfront.    
   \*Example:\* "Analyze the attached sales CSV file. Reference this market report: \[link\]. Consider current economic trends from 2026."

4\. \*\*Detailed Task Description & Rules (Break down with constraints)\*\*    
   Elaborate on the task with specifics, success criteria, and limitations. Tell Claude what to do positively (not what to avoid). For complex tasks, include verification steps.    
   \*Example:\* "Identify top 3 trends in the data. Provide evidence-based predictions. Limit response to 800 tokens; verify calculations before finalizing."

5\. \*\*Examples (Use few-shot learning)\*\*    
   Provide 1-3 high-quality examples to model the desired output. Ensure they align precisely with the task—Claude generalizes strongly from them.    
   \*Example:\*    
   \<example\>    
   Input: Q1 sales data. Output: Trend 1: 15% growth in electronics (source: row 45-60). Prediction: Continued rise due to AI demand.    
   \</example\>

6\. \*\*Conversation History (Maintain continuity)\*\*    
   Reference or summarize prior interactions for stateful tasks. Claude 4.5 excels at context awareness across windows—use memory tools or notes for long-horizon work.    
   \*Example:\* \<history\>Previous analysis showed seasonal dips; build on that for Q2 projections.\</history\>

7\. \*\*Immediate Task Description (Focus on the current action)\*\*    
   State the exact step with clear verbs. Distinguish from the overall goal, especially for agentic flows where Claude delegates sub-tasks.    
   \*Examples:\*    
   ✅ "Compute average growth rate and plot trends."    
   ❌ "Do some analysis." (Too vague)

8\. \*\*Deep Thinking (Encourage reasoning)\*\*    
   Prompt chain-of-thought (CoT) or interleaved reflection, especially after tool use. Use alternatives like "evaluate" if extended thinking is disabled. New in 4.5: Emphasize post-tool reflection for accuracy.    
   \*Example:\* "Think step-by-step: First, load data; second, identify outliers; third, reflect on implications before recommending."

9\. \*\*Output Formatting (Structure the response)\*\*    
   Specify formats like prose paragraphs, JSON, or tables. Use XML tags to control aesthetics or avoid over-formatting. Claude 4.5 responds well to matching prompt style to output.    
   \*Example:\* \<output\_format\>Structure as: Summary paragraph, Bullet insights, JSON predictions.\</output\_format\>

10\. \*\*Behavioral Controls & Prefills (Guide with XML and starters)\*\*    
    Use XML tags for fine-tuned behavior (e.g., parallel tools, cleanup). Optional: Prefill partial responses. Updated for 4.5: More responsive to system-level controls like \<use\_parallel\_tool\_calls\> for efficiency.    
    \*Example:\* \<avoid\_excessive\_markdown\>Write in prose.\</avoid\_excessive\_markdown\> Start with: "Key Trends: "

\#\#\# Additional Tips for Claude 4.5 (2026 Updates)  
\- \*\*Formula Summary:\*\* Layer steps: Context → Tone → Background → Details → Examples → History → Action → Thinking → Format → Controls.  
\- \*\*Before & After Example:\*\*    
  \*Basic:\* "Analyze sales."    
  \*Enhanced:\* "You are a strategist using Claude Sonnet 4.5. Analyze Q4 sales for growth opportunities, motivated by cost reduction. Use professional prose. Data: \[CSV\]. Break down trends with evidence. Think step-by-step after calculations. Format: Paragraph summary, table. \<default\_to\_action\>Proceed with recommendations.\</default\_to\_action\>"  
\- \*\*Advanced Techniques:\*\*   
  \- XML for agentic control: Maximize parallelism with \<use\_parallel\_tool\_calls\>.  
  \- State management: Save progress in files or git for multi-window tasks.  
  \- Multimodal: Crop images for better vision analysis.  
  \- Research: Track hypotheses and confidence.  
  \- Avoid over-specificity: Too many rules can worsen results; balance with flexibility.  
\- \*\*Model Selection:\*\* Opus 4.5 for complex reasoning; Sonnet 4.5 for balance; Haiku 4.5 for speed.  
\- \*\*Common Pitfalls:\*\* Vague instructions lead to underperformance; always be explicit about features like animations or delegations.  
\- \*\*Resources:\*\* Anthropic's Prompt Engineering Guide, System Prompts (Jan 2026), and blogs on best practices.

This framework leverages Claude's current capabilities for efficient, high-quality interactions.