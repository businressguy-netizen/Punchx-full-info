<div align="center">

# PunchX

### Discover trusted local services. Book with confidence.

**PunchX** is a digital marketplace being built to connect people with local service professionals for everyday home, personal-care, repair, maintenance and lifestyle needs.

[Website](https://www.punchxapp.co.in) · [Report an issue](https://github.com/businressguy-netizen/Punchx-full-info/issues)

</div>

---

## Table of contents

- [About PunchX](#about-punchx)
- [The problem we are solving](#the-problem-we-are-solving)
- [Our approach](#our-approach)
- [Service catalogue](#service-catalogue)
- [Platform capabilities](#platform-capabilities)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Development commands](#development-commands)
- [Security and responsible use](#security-and-responsible-use)
- [Project status](#project-status)
- [Contributing](#contributing)
- [Contact](#contact)

## About PunchX

PunchX is an independent digital service marketplace designed to make local services easier to discover and arrange. It aims to help customers find suitable professionals while giving professionals a digital channel to present their services and manage service requests.

Our initial focus is on Kolkata and West Bengal, with a longer-term ambition to expand to more communities across India as operations, service quality and professional availability grow.

### Our mission

Make everyday services easier to find, simpler to book and more dependable for both customers and local professionals.

### Our vision

Build a trusted, accessible service ecosystem that helps local professionals grow their reach and helps customers make informed choices.

## The problem we are solving

Finding a reliable local professional can involve scattered recommendations, unclear pricing, uncertain availability and limited visibility into service quality. Independent professionals can also struggle to reach new customers and organise enquiries.

PunchX is being developed to bring service discovery and booking into a more organised digital experience.

## Our approach

PunchX is intended to support both sides of the marketplace:

- **For customers:** discover relevant service categories, review service options, provide booking details and connect with professionals.
- **For professionals:** present relevant skills, receive service opportunities and build credibility through a more structured digital presence.
- **For operations:** organise categories, service requests and marketplace information so the platform can improve with feedback.

PunchX is a marketplace connecting customers with independent local professionals; it should not be understood as claiming every listed professional is a PunchX employee.

## Service catalogue

The current catalogue is organised into **40 main service categories**. The categories group related tasks under clear headings instead of showing overlapping labels as separate top-level services.

| Area | Example services |
|---|---|
| Electrical and plumbing | Electrical repairs, wiring, taps, pipes and drainage |
| Repairs and installations | Carpentry, appliance repair, AC service, RO/water purifier service |
| Devices and technology | Mobile, computer, TV, CCTV, Wi-Fi and smart-home setup |
| Cleaning and home care | Home deep cleaning, sofa and carpet cleaning, pest control, sanitisation |
| Home improvement | Painting, masonry, tiles, waterproofing, glass, locks, welding and false ceilings |
| Beauty and personal care | At-home beauty, grooming, massage and spa appointments |
| Clothing and personal items | Tailoring, alterations, laundry, ironing, shoe and bag repair |
| Household and outdoor help | Domestic help, gardening, cooking and household assistance |
| Moving and local assistance | Packers and movers, local delivery and errands |
| Events and lifestyle | Catering, decoration, photography, videography, DJ/sound and security |

The catalogue includes dedicated categories for **Appliance Repair** (including washing machines and refrigerators), **Vehicle Washing & Detailing**, **Domestic Help & Household Assistance**, **Massage & Spa at Home**, and **Home Disinfection & Sanitisation**.

> **Availability and pricing:** Catalogue entries and example starting prices are not a guarantee that every service is live in every location. Actual availability, final price, materials, travel charges and appointment options should be confirmed in the product before a booking is accepted.

## Platform capabilities

The project is being developed around the following product areas. The availability of individual capabilities may vary by environment and integration status.

- **Service discovery:** browse and search service categories and specific tasks.
- **Service catalogue:** organise categories, subcategories and service options with indicative prices.
- **Customer booking experience:** collect the information needed to request a service.
- **Professional experience:** support professional profiles, skill information and service requests.
- **Location-aware experiences:** support location and map-related workflows where configured.
- **Trust and feedback:** support professional verification workflows, ratings and reviews where enabled.
- **Payments:** payment integration work, including Razorpay configuration, subject to environment setup and testing.
- **AI-assisted experiences:** Gemini integration for supported AI features when credentials and relevant functionality are configured.
- **Operations and administration:** organise marketplace information and service workflows.

This README describes the product direction and repository. It does not guarantee that every listed capability is production-ready or available to every user.

## Technology stack

The repository currently includes the following technologies and integrations:

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling and UI | Tailwind CSS, Motion, Lucide React |
| Backend | Node.js, Express, TypeScript |
| Data and cloud services | Firebase, Firebase Admin, Google Cloud Firestore, PostgreSQL client |
| Authentication integration | NamoID SDK; Firebase authentication dependencies |
| AI integration | Google Gemini via `@google/genai` |
| Maps | Google Maps integration via `@vis.gl/react-google-maps` |
| Payments | Razorpay integration configuration |
| Security and middleware | Helmet, CORS, express-rate-limit |
| Deployment and analytics | Vercel configuration and Vercel Analytics |

The actual services enabled in a deployment depend on its environment variables and backend configuration.

## Project structure

Key files and directories include:

```text
.
├── src/
│   ├── components/       # React UI and product components
│   ├── data/             # Service categories, catalogues and hierarchy
│   └── lib/               # Shared client-side integrations and utilities
├── server.ts              # Express server entry point
├── package.json           # Dependencies and development scripts
├── .env.example           # Environment-variable template
└── README.md              # Project documentation
```

This is a high-level guide; individual directories may contain additional modules.

## Getting started

### Prerequisites

- Node.js compatible with the project's dependencies
- npm
- Git
- Access to the required development credentials for any integrations you intend to test

### 1. Clone the repository

```bash
git clone https://github.com/businressguy-netizen/Punchx-full-info.git
cd Punchx-full-info
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file based on `.env.example` and fill in the values needed for the features you plan to run. See [Environment configuration](#environment-configuration).

### 4. Start the development server

```bash
npm run dev
```

Use the local URL printed by the development server. Some features will not work until their external services and credentials are configured.

### 5. Build and validate

```bash
npm run lint:typecheck
npm run lint
npm run build
```

Run the checks before submitting changes. A successful local build does not replace testing the actual customer and professional workflows.

## Environment configuration

The repository provides an `.env.example` template. Depending on the feature, it may include configuration for:

- Gemini API access
- Application URL
- Firebase project configuration
- Google Maps API keys
- NamoID client and callback configuration
- An optional backend URL for a separately hosted frontend
- Razorpay's **public key ID** for frontend checkout

Use your own development credentials and the official provider dashboards. Do not commit real secrets, private API keys, service-account JSON, database passwords, payment secrets or production tokens.

**Important:** Only a public Razorpay key ID belongs in frontend environment variables. Keep Razorpay secret keys and all server-side credentials on the server. Restrict browser API keys to the required domains and APIs.

## Development commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server through `tsx` |
| `npm run build` | Build the frontend and bundle the server |
| `npm run build:pages` | Build the frontend only |
| `npm start` | Run the built server |
| `npm run lint` | Run ESLint |
| `npm run lint:typecheck` | Run TypeScript type checking |
| `npm run format` | Format files with Prettier |

## Security and responsible use

- Never commit secrets or production credentials.
- Do not bypass authentication, authorisation, professional verification or payment checks to make a test pass.
- Validate user input and enforce access control on the server for sensitive operations.
- Test booking, cancellation, payment and location workflows in a safe development environment before release.
- Handle customer and professional personal information only for legitimate product purposes and protect it appropriately.
- Clearly communicate service scope, pricing, availability, cancellation terms and any applicable safety requirements.

If you discover a security issue, do not publish sensitive exploit details or credentials in a public issue. Contact the project team privately.

## Project status

PunchX is an evolving product. The service catalogue and application workflows are being iterated on as development, testing, professional onboarding and customer feedback progress.

**Before describing a feature as launched, confirm it works in the target environment.** Merged code, a successful preview deployment and a live production release are different milestones.

## Contributing

Contributions from developers, designers and other collaborators are welcome through the repository's normal review process.

1. Create a focused branch from the latest `main`.
2. Keep changes scoped and document important behaviour changes.
3. Run type checking, linting and the production build.
4. Test the affected customer or professional workflow.
5. Open a pull request describing the change, validation performed and any remaining limitations.
6. Never include secrets, private customer data or real payment credentials in commits or screenshots.

## Contact

- **Website:** [punchxapp.co.in](https://www.punchxapp.co.in)
- **Email:** [punchxservice@gmail.com](mailto:punchxservice@gmail.com)
- **GitHub repository:** [PunchX-full-info](https://github.com/businressguy-netizen/Punchx-full-info)

---

<div align="center">

**PunchX — Local services, made easier to discover.**

</div>
