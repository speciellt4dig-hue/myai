import { FunctionDeclaration, GoogleGenAI, Type } from "@google/genai";
import { MediaItem, ActiveFile } from "../types";

// --- Tool Declarations ---

export const toolsDeclaration: FunctionDeclaration[] = [
  {
    name: 'open_website',
    description: 'Opens a specified website URL in a new tab.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'The full URL (e.g., https://www.google.com).' },
      },
      required: ['url'],
    },
  },
  {
    name: 'read_active_file',
    description: 'Reads the content of the file currently uploaded by the user.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'consult_logic_core',
    description: 'Use for complex reasoning, math, coding, or deep analysis. Uses Gemini 3 Pro with Thinking.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'The complex problem or question to solve.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'generate_image',
    description: 'Generates a high-quality image using Gemini 3 Pro Image. Supports various aspect ratios.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'Detailed description of the image.' },
        aspectRatio: { 
            type: Type.STRING, 
            description: 'Aspect ratio: "1:1", "3:4", "4:3", "9:16", "16:9". Default "16:9".',
            enum: ["1:1", "3:4", "4:3", "9:16", "16:9"]
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'generate_video',
    description: 'Generates a video using Veo 3.1. Takes about 1-2 minutes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'Description of the video content.' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'search_web',
    description: 'Search Google for real-time information, news, or facts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'The search query.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'find_places',
    description: 'Find places, restaurants, or locations using Google Maps.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'What to look for (e.g., "Italian restaurants nearby").' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_current_time',
    description: 'Returns the current local time.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
];

// --- Helper Functions ---

const getUserLocation = (): Promise<{latitude: number, longitude: number} | undefined> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
        resolve(undefined);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (position) => {
            resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            });
        },
        (error) => {
            console.warn("Location access denied or error:", error);
            resolve(undefined);
        },
        { timeout: 5000 }
    );
  });
}

// --- Execution Logic ---

export const executeTool = async (
    name: string, 
    args: any, 
    apiKey: string,
    onMediaGenerated: (item: MediaItem) => void,
    activeFile: ActiveFile | null
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey });

  try {
    switch (name) {
      case 'open_website': {
        let url = args.url;
        if (!url.startsWith('http')) url = 'https://' + url;
        window.open(url, '_blank');
        return { result: `Opened website: ${url}` };
      }

      case 'get_current_time': {
        return { result: `Current time: ${new Date().toLocaleTimeString()}` };
      }

      case 'read_active_file': {
        if (!activeFile) {
            return { result: "No file is currently uploaded." };
        }
        // Limit content size to prevent context overflow if it's massive, 
        // though Flash handles 1M tokens, it's safer to truncate for latency in Live API.
        const content = activeFile.content.length > 50000 
            ? activeFile.content.substring(0, 50000) + "... [TRUNCATED]" 
            : activeFile.content;
        return { result: `File Name: ${activeFile.name}\nContent:\n${content}` };
      }

      case 'consult_logic_core': {
        // Gemini 3 Pro with Thinking
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: args.query,
            config: {
                thinkingConfig: { thinkingBudget: 16000 } // Using 16k to be safe, max is 32k
            }
        });
        return { result: response.text };
      }

      case 'search_web': {
        // Gemini 2.5 Flash with Search Grounding
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: args.query,
            config: { tools: [{ googleSearch: {} }] }
        });
        
        // Extract chunks for UI
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const text = response.text;
        
        onMediaGenerated({
            id: Math.random().toString(36).substring(7),
            type: 'search',
            content: text,
            metadata: { groundingChunks: chunks },
            timestamp: new Date().toLocaleTimeString()
        });
        
        return { result: `Search complete. I have displayed the results: ${text}` };
      }

      case 'find_places': {
        // Fetch user location for better results
        const location = await getUserLocation();
        
        // Gemini 2.5 Flash with Maps Grounding
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: args.query,
            config: { 
                tools: [{ googleMaps: {} }],
                toolConfig: location ? {
                    googleMaps: {
                        // @ts-ignore - The SDK type definition might lag slightly behind, but this is the correct structure
                        retrievalConfig: {
                            latLng: location
                        }
                    }
                } : undefined
            }
        });

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        onMediaGenerated({
            id: Math.random().toString(36).substring(7),
            type: 'map',
            content: response.text,
            metadata: { groundingChunks: chunks },
            timestamp: new Date().toLocaleTimeString()
        });

        return { result: `I found some places. details are on the display.` };
      }

      case 'generate_image': {
        // Gemini 3 Pro Image
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: args.prompt,
            config: {
                imageConfig: {
                    aspectRatio: args.aspectRatio || "16:9",
                    imageSize: "1K"
                }
            }
        });

        let imageUrl = '';
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                break;
            }
        }

        if (imageUrl) {
            onMediaGenerated({
                id: Math.random().toString(36).substring(7),
                type: 'image',
                url: imageUrl,
                title: args.prompt,
                timestamp: new Date().toLocaleTimeString()
            });
            return { result: "Image generated and displayed on screen." };
        } else {
            return { result: "Failed to generate image." };
        }
      }

      case 'generate_video': {
        // Veo 3.1
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: args.prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        // Simple polling
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
            // Fetch the actual bytes using the key
            const vidRes = await fetch(`${videoUri}&key=${apiKey}`);
            const blob = await vidRes.blob();
            const url = URL.createObjectURL(blob);

            onMediaGenerated({
                id: Math.random().toString(36).substring(7),
                type: 'video',
                url: url,
                title: args.prompt,
                timestamp: new Date().toLocaleTimeString()
            });
            return { result: "Video generated and ready to play." };
        }
        return { result: "Video generation failed." };
      }

      default:
        return { result: 'Function not found' };
    }
  } catch (e: any) {
    console.error("Tool Execution Error", e);
    return { result: `Error executing tool: ${e.message}` };
  }
};