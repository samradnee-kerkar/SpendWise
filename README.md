<p align="center">
  <img src="docs/screenshots/logo.jpg" alt="SpendWise logo" width="120">
</p>

# SpendWise

SpendWise is a personal expense tracker mobile app. It helps you record income and expenses, set monthly budgets, and understand where your money goes. It is built with React Native (Expo) and Firebase, and it works on Android and on the web.

This is a second-year (Semester 3) IT engineering college mini-project.

## Features

- **Login and registration** with Firebase Authentication (email and password), with friendly error messages
- **Dashboard** with total balance, this month's income and expenses, and recent transactions that update live
- **Add transaction** with an income/expense switch, amount, category, description and a calendar date picker
- **Custom categories**: tap "Other", type your own category once, and it is saved for reuse everywhere
- **Transactions history** with filters (income/expense and category), edit and delete
- **Analytics** with income vs expense, spending by category, and a 6-month trend, with a month selector
- **Budgets** with monthly limits per category, spent and remaining amounts, and colour-coded progress bars (green, orange near the limit, red when over)
- **Profile** with your details, balance converted to other currencies, theme switch and logout
- **Currency conversion** using the live Frankfurter exchange-rate API (all supported currencies, searchable)
- **Dark and light theme**, dark by default, and your choice is remembered
- **Animated splash screen** and custom app icon
- **Private data**: Firestore security rules let each user read and write only their own data

## Screens

1. Login
2. Register
3. Dashboard
4. Transactions
5. Add Transaction
6. Analytics
7. Budgets
8. Profile

(plus an animated splash screen)

## Tech stack

| Part          | Technology                                           |
| ------------- | ---------------------------------------------------- |
| Framework     | Expo SDK 58, React Native 0.88, React 19, TypeScript |
| Navigation    | Expo Router (file-based, typed routes)               |
| UI library    | React Native Paper                                   |
| Icons         | @expo/vector-icons                                   |
| Backend       | Firebase Authentication and Cloud Firestore          |
| Local storage | AsyncStorage (saves the theme choice)                |
| External API  | Frankfurter (currency exchange rates)                |

## Database structure (Firestore)

- `users/{uid}`: name, email, currency, displayCurrency, createdAt
- `users/{uid}/transactions/{id}`: type, amount, category, description, date, createdAt
- `users/{uid}/budgets/{category}`: category, limit, updatedAt
- `users/{uid}/categories/{id}`: name, type, createdAt

## Security rules

Each user can only access their own data:

    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{userId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
          match /{document=**} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
        }
      }
    }

## How to run the project

1. Install [Node.js](https://nodejs.org) and [Git](https://git-scm.com).
2. Clone the repository:

   git clone https://github.com/samradnee-kerkar/SpendWise.git
   cd SpendWise

3. Install the packages:

   npm install

4. Start the app:

   npx expo start --clear

5. Open it:
   - **On an Android phone:** install the **Expo Go** app, then scan the QR code shown in the terminal.
   - **In a browser:** press `w` in the terminal.

The Firebase web configuration is already included in `src/lib/firebase.ts`, so no extra setup is needed. Firebase web keys are safe to share because the data is protected by the Firestore security rules above.

## Project structure

    src/
      app/
        _layout.tsx        Providers and login/logout routing
        login.tsx
        register.tsx
        budgets.tsx
        (tabs)/
          index.tsx        Dashboard
          explore.tsx      Transactions
          add.tsx          Add Transaction
          analytics.tsx    Analytics
          profile.tsx      Profile
      components/          Tabs, splash screen, themed components
      constants/theme.ts   Light and dark colours
      hooks/               Theme hooks
      lib/                 Firebase setup, auth hook, categories hook

## Screenshots

| Login and Register                                         | Dashboard                                    | Add Transaction                              |
| ---------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| ![Login and Register](docs/screenshots/authentication.jpg) | ![Dashboard](docs/screenshots/dashboard.jpg) | ![Add Transaction](docs/screenshots/add.jpg) |

| Transactions                                       | Analytics                                    | Analytics (6-month graph)                                |
| -------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| ![Transactions](docs/screenshots/transactions.jpg) | ![Analytics](docs/screenshots/analytics.jpg) | ![Analytics graph](docs/screenshots/analytics-graph.jpg) |

| Budgets                                  | Profile                                  |
| ---------------------------------------- | ---------------------------------------- |
| ![Budgets](docs/screenshots/budgets.jpg) | ![Profile](docs/screenshots/profile.jpg) |

## Author

Samradnee Kerkar, Second Year (Semester 3) IT Engineering
