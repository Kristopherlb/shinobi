# Shinobi Agentic Developer Platform (ADP) Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from Perplexity's clean, citation-rich interface combined with Codex's developer-focused aesthetic. This creates a sophisticated, professional tool optimized for technical users who value efficiency and clarity.

## Core Design Principles
- **Dark-mode first**: All interfaces default to dark theme
- **Citation-rich**: Information includes footnote-style references and links
- **Developer-first**: Optimized for technical workflows and keyboard navigation
- **Minimal chrome**: Reduced visual noise, focus on content
- **High contrast**: Ensures readability in all lighting conditions

## Color Palette
**Primary Colors:**
- Primary: 251 91% 73% (violet accent for interactive elements)
- Primary foreground: 230 25% 98% (near white)

**Surface Colors:**
- Background: 230 23% 9% (dark sapphire base - main canvas)
- Surface: 231 23% 11% (elevated cards/panels)
- Surface secondary: 232 22% 13% (hover states)
- Surface tertiary: 233 20% 15% (active/selected states)

**Text Colors:**
- Foreground: 230 25% 95% (primary text - high contrast)
- Muted foreground: 230 10% 65% (secondary text)
- Accent foreground: 185 95% 68% (teal for citations/links)

**Status & Accent Colors:**
- Success: 142 86% 58% (green indicators)
- Warning: 38 92% 60% (amber alerts)
- Destructive: 0 84% 65% (red errors)
- Info: 217 91% 68% (blue information)
- Citation: 185 95% 68% (teal for references/links)

**Borders:**
- Border: 231 20% 18% (subtle panel separation)
- Border accent: 251 50% 35% (interactive element borders)

## Typography
**Font Families:**
- UI Text: Inter (clean, modern sans-serif)
- Code/Monospace: JetBrains Mono (excellent code readability)

**Scale & Weights:**
- H1: 1.75rem, weight 700
- H2: 1.5rem, weight 700
- H3: 1.25rem, weight 600
- Body: 1rem, weight 400
- Code: 0.95rem, weight 500

**Line Heights:**
- Headings: 1.2 (tight for impact)
- Body text: 1.6 (comfortable reading)

## Layout System
**Split-Pane Architecture:**
- Primary workspace: Main content area with generous padding
- Metadata rail: Right sidebar for contextual information and citations
- Timeline rail: Left timeline for activity feeds and status updates
- Command palette: Overlay for keyboard-first navigation

**Spacing Units:**
- Dense spacing: 1, 2 units (4px, 8px) for citations and metadata
- Standard spacing: 3, 4 units (12px, 16px) for content sections  
- Generous spacing: 6, 8 units (24px, 32px) for major layout areas
- Citation spacing: 1.5, 2.5 units (6px, 10px) for footnote-style references

**Grid & Structure:**
- Content max-width: 1600px (wider for developer tools)
- Split ratios: 70/30 or 75/25 for main/sidebar layouts
- Timeline width: 280px fixed for activity rails
- Metadata rail: 320px for citation scaffolding

## Component Library
**Navigation:**
- AppShell with collapsible sidebar
- Breadcrumb navigation for deep hierarchies
- Command palette (Cmd/Ctrl+K) for quick actions

**Data Display:**
- Timeline markers with status indicators and timestamps
- Citation badges with footnote-style numbering and references
- Modular cards with minimal chrome and content density
- Live status chips with ambient color coding
- DiffViewer for code changes (unified/split view)
- CodeBlock with syntax highlighting and ambient accents
- Metadata annotations for contextual information

**Interactive Elements:**
- Button variants: primary, secondary, ghost, destructive
- Modal dialogs with backdrop blur
- Panel layouts for detailed views
- Stepper components for multi-step processes

**Feedback & Status:**
- Alert components for all status types
- Skeleton loading states
- EmptyState illustrations for zero-data scenarios
- Toast notifications for actions

## Visual Treatments
**Gradients:**
Subtle gradients on hero sections and call-to-action areas using primary and accent colors:
- Hero backgrounds: 240 82% 84% to 225 15% 6%
- Button highlights: Slight accent color overlay on hover

**Backgrounds:**
- Solid dark surfaces with subtle texture
- No busy patterns or distracting elements
- Clean separation between content sections

## Iconography
- Lucide React icon library (20px/24px sizes)
- Line-style icons for consistency
- Contextual icons for different content types

## Animation Guidelines
**Minimal & Purposeful:**
- Micro-interactions: 150-250ms duration
- Page transitions: Fade/slide effects
- Live data updates: Gentle fade-in for new items
- Loading states: Skeleton animations
- No decorative or distracting animations

## Accessibility Requirements
- Focus rings on all interactive elements
- Color contrast ratio ≥4.5:1
- Full keyboard navigation support
- Skip links for screen readers
- ARIA labels and roles throughout
- Support for prefers-reduced-motion

## Images
**No Hero Images:** This is a utility-focused developer tool. Visual emphasis comes from typography, spacing, and data visualization rather than imagery.

**Iconography Only:** Small contextual icons, status indicators, and data visualization elements. No decorative photography or illustrations except for EmptyState components.