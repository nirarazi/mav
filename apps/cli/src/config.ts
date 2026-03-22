import { MaverickConfig } from './api';

export function getConfig(): MaverickConfig {
  const apiKey = process.env.MAVERICK_API_KEY;
  const apiUrl = process.env.MAVERICK_API_URL;

  if (!apiKey) {
    console.error('❌ Error: MAVERICK_API_KEY environment variable is required');
    console.error('Please set it using: export MAVERICK_API_KEY=your_api_key');
    process.exit(1);
  }

  return {
    apiKey,
    apiUrl,
  };
}
