import logo from '../../assets/images/frish-logo.png'
import './Logo.css'

/**
 * Reusable FRISH brand logo.
 *
 * Renders ONLY the official logo image — the image itself already contains
 * the wordmark, fish graphic, and tagline, so no text is ever added in JSX.
 * Sizing (width) is controlled per-context via the `className` prop and its
 * matching CSS rules (e.g. login page vs. sidebar expanded/collapsed);
 * height is always `auto` so the aspect ratio can never be distorted.
 *
 * Props:
 * - className: context-specific class(es) that set width for this usage.
 */
export default function Logo({ className = '' }) {
  return (
    <img
      src={logo}
      alt="FRISH — AI Fish Freshness Monitoring"
      className={`logo-image ${className}`.trim()}
    />
  )
}
