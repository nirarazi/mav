import { MavConfig } from './api';

export function getConfig(): MavConfig {
  const apiKey = process.env.MAV_API_KEY;
  const apiUrl = process.env.MAV_API_URL;

  if (!apiKey) {
    console.error('❌ Error: MAV_API_KEY environment variable is required');
    console.error('Please set it using: export MAV_API_KEY=your_api_key');
    process.exit(1);
  }

  return {
    apiKey,
    apiUrl,
  };
}
