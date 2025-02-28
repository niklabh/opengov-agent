import { InsertProposal } from "@shared/schema";
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create DOMPurify instance for sanitizing HTML
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

interface PolkassemblyResponse {
  title: string;
  content: string;
  created_at: string;
  proposer: string;
}

export async function fetchProposalFromPolkassembly(proposalId: string): Promise<InsertProposal> {
  const response = await fetch(
    `https://polkadot.polkassembly.io/api/v1/posts/on-chain-post?postId=${proposalId}&proposalType=referendums_v2`,
    {
      headers: {
        "x-network": "polkadot"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch proposal: ${response.statusText}`);
  }

  const data = await response.json() as PolkassemblyResponse;

  // Sanitize the HTML content to prevent XSS attacks
  const sanitizedContent = DOMPurify.sanitize(data.content || "No description available.", {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 
                   'blockquote', 'code', 'pre', 'strong', 'em', 'img', 'br', 'div', 'span'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target']
  });

  return {
    chainId: proposalId,
    title: data.title,
    description: sanitizedContent,
    proposer: data.proposer || "Unknown",
    createdAt: data.created_at || new Date().toISOString()
  };
}