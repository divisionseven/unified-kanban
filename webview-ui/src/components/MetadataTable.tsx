import type { DataKey } from "../../../src/parser/types.ts";
import DOMPurify from "dompurify";

/** Props for the MetadataTable component */
interface MetadataTableProps {
  /** Array of key-value metadata items */
  items: Array<{ key: string; value: string; raw: string }>;
  /** Optional DataKey configuration for filtering and display options */
  metadataKeys?: DataKey[];
  /** CSS class name for the table */
  className?: string;
}

/**
 * Renders inline metadata as a key-value table below the card.
 * Supports filtering by metadataKeys and custom display options.
 */
export function MetadataTable({
  items,
  metadataKeys = [],
  className = "metadata-table",
}: MetadataTableProps): React.ReactElement {
  // Filter items based on metadataKeys configuration
  const filteredItems =
    metadataKeys.length > 0
      ? items.filter((item) => metadataKeys.some((dk) => dk.metadataKey === item.key))
      : items;

  // Get display options for a key
  const getDisplayOptions = (
    key: string,
  ): { shouldHideLabel: boolean; containsMarkdown: boolean } => {
    const keyConfig = metadataKeys.find((dk) => dk.metadataKey === key);
    return {
      shouldHideLabel: keyConfig?.shouldHideLabel ?? false,
      containsMarkdown: keyConfig?.containsMarkdown ?? false,
    };
  };

  if (filteredItems.length === 0) {
    return (
      <div className={`${className} metadata-table metadata-table-empty`}>
        <span className="metadata-table-empty-text">No metadata</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {filteredItems.map((item) => {
        const { shouldHideLabel, containsMarkdown } = getDisplayOptions(item.key);
        return (
          <div key={item.key} className="metadata-table-row">
            {!shouldHideLabel && <span className="metadata-table-key">{item.key}</span>}
            <span className="metadata-table-value">
              {containsMarkdown ? (
                <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.value) }} />
              ) : (
                item.value
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
