interface StatusBadgeProps {
  status: string;
}

interface BadgeColors {
  color: string;
  backgroundColor: string;
}

function getStatusColors(status: string): BadgeColors {
  const normalized = status.trim().toLowerCase();

  // Complete / Inspection Complete
  if (normalized === 'complete' || normalized === 'inspection complete') {
    return { color: '#fff', backgroundColor: '#5ca2e8' };
  }

  // Booked
  if (normalized === 'booked') {
    return { color: '#fff', backgroundColor: '#808080' };
  }

  // Pending / Payment Pending
  if (normalized === 'pending' || normalized === 'payment pending') {
    return { color: '#fff', backgroundColor: '#f88f05' };
  }

  // Cancelled
  if (normalized === 'cancelled') {
    return { color: '#fff', backgroundColor: '#e91e63' };
  }

  // Recheck
  if (normalized === 'recheck') {
    return { color: '#fff', backgroundColor: '#e85a5a' };
  }

  // Assigned
  if (normalized === 'assigned') {
    return { color: '#fff', backgroundColor: '#0054A8' };
  }

  // Default
  return { color: '#fff', backgroundColor: '#6c757d' };
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { color, backgroundColor } = getStatusColors(status);

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
        lineHeight: 1.5,
        color,
        backgroundColor,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}
