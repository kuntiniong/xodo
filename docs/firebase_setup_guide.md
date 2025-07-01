# Firebase Setup Guide

This guide walks you through setting up Firebase for the Xodo todo application.

## Prerequisites

- Google account
- Node.js and npm installed
- Access to Firebase console

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name (e.g., "xodo-todo-app")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Register Web App

1. In your Firebase project, click the web icon (`</>`) to add a web app
2. Enter app nickname (e.g., "Xodo Web App")
3. Choose whether to set up Firebase Hosting (optional)
4. Click "Register app"
5. Copy the Firebase configuration object - you'll need this for environment variables

## Step 3: Enable Authentication

1. In Firebase Console, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Google" provider:
   - Click on "Google"
   - Toggle "Enable"
   - Add your project support email
   - Click "Save"

## Step 4: Create Firestore Database

1. In Firebase Console, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
   - **Important**: Change to production rules before deploying
4. Select a location for your database (choose closest to your users)
5. Click "Done"

## Step 5: Configure Security Rules

1. In Firestore Database, go to "Rules" tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write only their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Allow read/write access to user's todo lists
      match /todoLists/{listId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. Click "Publish"

## Step 6: Set Up Environment Variables

1. Create `.env.local` file in your project root (if not exists)
2. Add your Firebase configuration:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

**Note**: Replace the placeholder values with your actual Firebase configuration values.

## Step 7: Configure OAuth Consent Screen (Optional but Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to "APIs & Services" > "OAuth consent screen"
4. Configure your app information:
   - App name: "Xodo Todo App"
   - User support email: Your email
   - App logo: Upload your app logo (optional)
   - Application home page: Your app URL
   - Privacy policy: Link to privacy policy (optional)

## Step 8: Add Authorized Domains

1. In Firebase Console, go to "Authentication" > "Settings" > "Authorized domains"
2. Add your domains:
   - `localhost` (for development)
   - Your production domain (e.g., `xodo-app.com`)

## Step 9: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your app in browser
3. Try signing in with Google
4. Check Firebase Console:
   - "Authentication" > "Users" should show your user
   - "Firestore Database" > "Data" should show user documents after adding todos

## Step 10: Production Considerations

### Security Rules
Before going to production, review and tighten your Firestore security rules.

### Environment Variables
- Never commit `.env.local` to version control
- Use your hosting platform's environment variable settings for production
- Consider using Firebase App Check for additional security

### Monitoring
Enable Firebase Analytics and Performance Monitoring:
1. Go to "Analytics" in Firebase Console
2. Follow setup instructions
3. Configure events and user properties as needed

### Backup
Set up regular Firestore backups:
1. Go to "Firestore Database" > "Backups"
2. Set up automated backup schedule

## Troubleshooting

### Common Issues

#### "Firebase App named '[DEFAULT]' already exists"
- This happens if Firebase is initialized multiple times
- Make sure Firebase is only initialized once in your app
- Check for duplicate imports or multiple initialization calls

#### "Missing or insufficient permissions"
- Check your Firestore security rules
- Ensure user is properly authenticated
- Verify the document path matches your security rules

#### "Invalid API key"
- Double-check your environment variables
- Ensure the API key is correct and hasn't been regenerated
- Make sure environment variables are prefixed with `NEXT_PUBLIC_`

#### "Auth domain not authorized"
- Add your domain to authorized domains in Firebase Console
- Include both `localhost` and your production domain

### Debug Mode

To enable Firebase debug logging in development:

```javascript
// Add to your firebase.ts config file
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

if (process.env.NODE_ENV === 'development') {
  // Enable debug logging
  console.log('Firebase debug mode enabled');
  
  // Optionally connect to emulators
  // connectAuthEmulator(auth, "http://localhost:9099");
  // connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## Next Steps

After completing the setup:

1. Test all authentication flows
2. Create some todo items and verify they sync to Firestore
3. Test signing out and back in to ensure data persistence
4. Review the authentication documentation for usage details
5. Plan your production deployment and security review

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com/)
