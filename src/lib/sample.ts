import { AmbitItem } from "./ambit";

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

export function isBuiltInSampleInput(contractText: string, messageText: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  return norm(contractText) === norm(SAMPLE_CONTRACT) && norm(messageText) === norm(SAMPLE_MESSAGE);
}
