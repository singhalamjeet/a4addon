# Hello World App

A minimal Node.js Express application that displays "Hello World" on the homepage.

## Features

- Simple Express.js server
- Static HTML page with modern design
- Supabase integration with environment-based configuration
- Health check endpoint for deployment platforms
- Docker support for easy deployment
- Ready for Coolify deployment

## Local Development

### Prerequisites

- Node.js 18 or higher
- npm

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Supabase (optional):
   - Copy `.env.example` to `.env`
   - Get your Supabase credentials from [https://app.supabase.com/project/_/settings/api](https://app.supabase.com)
   - Update the `.env` file with your `SUPABASE_URL` and `SUPABASE_ANON_KEY`

4. Start the development server:
   ```bash
   npm start
   ```

5. Open your browser and visit `http://localhost:3000`

## Deployment on Coolify

### Option 1: Git-based Deployment (Recommended)

1. Push this code to a Git repository (GitHub, GitLab, etc.)
2. In Coolify, create a new application
3. Connect your Git repository
4. Coolify will automatically detect the Dockerfile and build your app
5. Set the port to `3000` if not auto-detected
6. **Configure environment variables** in Coolify:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key
7. Deploy!

### Option 2: Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t hello-world-app .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 hello-world-app
   ```

## Environment Variables

- `PORT` - The port the server will listen on (default: 3000)
- `SUPABASE_URL` - Your Supabase project URL (optional)
- `SUPABASE_ANON_KEY` - Your Supabase anonymous/public key (optional)

## Endpoints

- `/` - Main homepage displaying "Hello World"
- `/health` - Health check endpoint (returns JSON status)
- `/api/supabase-status` - Supabase connection status

## License

MIT
