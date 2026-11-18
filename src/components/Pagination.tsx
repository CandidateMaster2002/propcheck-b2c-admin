'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  const startEntry = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntry = Math.min(currentPage * itemsPerPage, totalItems);

  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  const buttonBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    cursor: 'pointer',
    transition: 'background-color 0.15s, color 0.15s, border-color 0.15s',
    userSelect: 'none',
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonBase,
    backgroundColor: '#0066cc',
    color: '#ffffff',
    borderColor: '#0066cc',
    cursor: 'default',
  };

  const enabledButtonStyle: React.CSSProperties = {
    ...buttonBase,
    backgroundColor: '#ffffff',
    color: '#374151',
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonBase,
    backgroundColor: '#f9fafb',
    color: '#9ca3af',
    cursor: 'not-allowed',
    borderColor: '#e5e7eb',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.75rem 0',
        fontSize: '0.875rem',
        color: '#6b7280',
      }}
    >
      {/* Entry count */}
      <span>
        {totalItems === 0
          ? 'No entries found'
          : `Showing ${startEntry} to ${endEntry} of ${totalItems} entries`}
      </span>

      {/* Pagination controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={() => !isPrevDisabled && onPageChange(currentPage - 1)}
          disabled={isPrevDisabled}
          style={isPrevDisabled ? disabledButtonStyle : enabledButtonStyle}
          onMouseEnter={(e) => {
            if (!isPrevDisabled) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
            }
          }}
          onMouseLeave={(e) => {
            if (!isPrevDisabled) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff';
            }
          }}
          aria-label="Previous page"
        >
          Previous
        </button>

        <span
          style={activeButtonStyle}
          aria-current="page"
        >
          {currentPage}
        </span>

        <button
          onClick={() => !isNextDisabled && onPageChange(currentPage + 1)}
          disabled={isNextDisabled}
          style={isNextDisabled ? disabledButtonStyle : enabledButtonStyle}
          onMouseEnter={(e) => {
            if (!isNextDisabled) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
            }
          }}
          onMouseLeave={(e) => {
            if (!isNextDisabled) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff';
            }
          }}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
