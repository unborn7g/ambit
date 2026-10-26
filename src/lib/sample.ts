import { AmbitItem } from "./ambit";

export type BuiltInSampleId = "architecture" | "web-design";

export interface BuiltInSample {
  id: BuiltInSampleId;
  label: string;
  contract: string;
  message: string;
  hourlyRate: number;
  getItems: () => AmbitItem[];
}

export const SAMPLE_CONTRACT = `Scope of work: exterior visualization for a two-storey house.
1. Three exterior renders, 4K resolution, daytime lighting.
2. Up to two revision rounds covering materials, colours and camera angle. Changes to the building's layout or massing count as new work.
3. Delivery within 7 days of receiving the 3D model.
4. Additional work is billed at the agreed hourly rate.`;

export const SAMPLE_MESSAGE = `Hi! The renders look great, thank you. A few quick things:
1) Can you change the facade to brick?
2) Add a night version of render 2.
3) Do a 30-second walkthrough video.
4) Put the client's logo on every image.
5) Move the entrance to the other side of the building, should be quick 🙏`;

export const SAMPLE_HOURLY_RATE = 25;

export function getSampleItems(): AmbitItem[] {
  return [
    {
      id: 1,
      short: "brick facade",
      requestText: "Can you change the facade to brick?",
      clauseTag: "Clause 2",
      clauseQuote: "Up to two revision rounds covering materials, colours and camera angle.",
      reason: "A material change is a revision, and you have two rounds.",
      status: "Covered",
      hours: 0,
    },
    {
      id: 2,
      short: "night version",
      requestText: "Add a night version of render 2.",
      clauseTag: "Clause 1",
      clauseQuote: "Three exterior renders, 4K resolution, daytime lighting.",
      reason: "The contract lists daytime renders only. A night version is new work.",
      status: "Extra",
      hours: 3,
    },
    {
      id: 3,
      short: "walkthrough video",
      requestText: "Do a 30-second walkthrough video.",
      clauseTag: "Clause 1",
      clauseQuote: "Three exterior renders, 4K resolution, daytime lighting.",
      reason: "The contract lists still renders only. A video is a new deliverable.",
      status: "Extra",
      hours: 8,
    },
    {
      id: 4,
      short: "logo on every image",
      requestText: "Put the client's logo on every image.",
      clauseTag: "No clause",
      clauseQuote: "No matching clause found",
      reason: "The contract says nothing about logos or branding. You decide.",
      status: "Unclear",
      hours: 2,
    },
    {
      id: 5,
      short: "entrance move",
      requestText: "Move the entrance to the other side of the building, should be quick",
      clauseTag: "Clause 2",
      clauseQuote: "Changes to the building's layout or massing count as new work.",
      reason: "Moving the entrance changes the layout, so it is new work.",
      status: "Extra",
      hours: 4,
    },
  ];
}

export const WEB_DESIGN_SAMPLE_CONTRACT = `Scope of work: marketing website design and Webflow build for a local bakery.
1. Four responsive pages: Home, Menu, About, and Contact.
2. Up to two rounds of copy and colour revisions before launch. Custom illustrations or logo redesigns count as new work.
3. Basic on-page SEO setup for title tags and meta descriptions.
4. Additional work is billed at the agreed hourly rate.`;

export const WEB_DESIGN_SAMPLE_MESSAGE = `Hey! The draft site looks awesome. Before we go live:
1) Can we swap the hero button colour to warm terracotta?
2) Add a custom illustrated map of our neighbourhood on the Contact page.
3) Build an online cake-ordering checkout page with Stripe.
4) Upload our 12 seasonal pastry photos to the Menu page.`;

export const WEB_DESIGN_SAMPLE_HOURLY_RATE = 40;

export function getWebDesignSampleItems(): AmbitItem[] {
  return [
    {
      id: 1,
      short: "hero button colour",
      requestText: "Can we swap the hero button colour to warm terracotta?",
      clauseTag: "Clause 2",
      clauseQuote: "Up to two rounds of copy and colour revisions before launch.",
      reason: "Changing a button colour is covered under your two colour revision rounds.",
      status: "Covered",
      hours: 0,
    },
    {
      id: 2,
      short: "illustrated map",
      requestText: "Add a custom illustrated map of our neighbourhood on the Contact page.",
      clauseTag: "Clause 2",
      clauseQuote: "Custom illustrations or logo redesigns count as new work.",
      reason: "The contract explicitly marks custom illustrations as new work.",
      status: "Extra",
      hours: 4,
    },
    {
      id: 3,
      short: "Stripe checkout page",
      requestText: "Build an online cake-ordering checkout page with Stripe.",
      clauseTag: "Clause 1",
      clauseQuote: "Four responsive pages: Home, Menu, About, and Contact.",
      reason: "The contract covers four static pages only. An online checkout page is new work.",
      status: "Extra",
      hours: 10,
    },
    {
      id: 4,
      short: "12 pastry photos",
      requestText: "Upload our 12 seasonal pastry photos to the Menu page.",
      clauseTag: "No clause",
      clauseQuote: "No matching clause found",
      reason: "The contract covers building the Menu page, but does not mention batch photo uploads. You decide.",
      status: "Unclear",
      hours: 2,
    },
  ];
}

export const BUILT_IN_SAMPLES: Record<BuiltInSampleId, BuiltInSample> = {
  architecture: {
    id: "architecture",
    label: "Architecture sample",
    contract: SAMPLE_CONTRACT,
    message: SAMPLE_MESSAGE,
    hourlyRate: SAMPLE_HOURLY_RATE,
    getItems: getSampleItems,
  },
  "web-design": {
    id: "web-design",
    label: "Web design sample",
    contract: WEB_DESIGN_SAMPLE_CONTRACT,
    message: WEB_DESIGN_SAMPLE_MESSAGE,
    hourlyRate: WEB_DESIGN_SAMPLE_HOURLY_RATE,
    getItems: getWebDesignSampleItems,
  },
};

export function matchBuiltInSample(
  contractText: string,
  messageText: string
): BuiltInSample | null {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const c = norm(contractText);
  const m = norm(messageText);
  for (const sample of Object.values(BUILT_IN_SAMPLES)) {
    if (norm(sample.contract) === c && norm(sample.message) === m) {
      return sample;
    }
  }
  return null;
}

export function isBuiltInSampleInput(contractText: string, messageText: string): boolean {
  return matchBuiltInSample(contractText, messageText) !== null;
}
