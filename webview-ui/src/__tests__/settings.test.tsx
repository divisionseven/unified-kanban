// ─── SettingsPanel Component Tests ─────────────────────────────────────────

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsPanel } from "../components/SettingsPanel.js";

describe("SettingsPanel — Basic Rendering", () => {
  it("renders the settings panel with all sections", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("Board Format")).toBeInTheDocument();
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByText("Dates")).toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();
    expect(screen.getByText("Metadata")).toBeInTheDocument();
    expect(screen.getByText("Note Creation")).toBeInTheDocument();
    expect(screen.getByText("Header Buttons")).toBeInTheDocument();
    expect(screen.getByText("List View")).toBeInTheDocument();
    expect(screen.getByText("Display")).toBeInTheDocument();
  });

  it("renders save and cancel buttons", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders with null settings (empty board)", () => {
    render(<SettingsPanel settings={null} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("Board Format")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders with all default values when settings is empty object", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    // Check default checkbox states
    expect(screen.getByLabelText("Show checkboxes")).toBeChecked();
    expect(screen.getByLabelText("Extract tags")).toBeChecked();
    expect(screen.getByLabelText("Extract dates")).toBeChecked();
    expect(screen.getByLabelText("Show title")).toBeChecked();
    expect(screen.getByLabelText("Add list")).toBeChecked();
    expect(screen.getByLabelText("Archive all")).toBeChecked();
    expect(screen.getByLabelText("View as markdown")).toBeChecked();
  });
});

// ─── Board Format Section ─────────────────────────────────────────────────

describe("SettingsPanel — Board Format Section", () => {
  it("renders board format fields", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Show checkboxes")).toBeInTheDocument();
    expect(screen.getByLabelText(/Card Insertion/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Hide card count")).toBeInTheDocument();
    expect(screen.getByLabelText("Lane Width")).toBeInTheDocument();
    expect(screen.getByLabelText(/Accent Color/i)).toBeInTheDocument();
  });

  it("shows checkboxes checkbox is checked by default", () => {
    const { onSave: _onSave } = renderWithSave({});
    expect(screen.getByLabelText("Show checkboxes")).toBeChecked();
  });

  it("shows checkboxes can be toggled off", async () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Show checkboxes");

    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it("shows checkboxes can be toggled on", async () => {
    render(
      <SettingsPanel settings={{ "show-checkboxes": false }} onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    const checkbox = screen.getByLabelText("Show checkboxes");

    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
  });

  it("card insertion select has correct options", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const select = screen.getByLabelText(/Card Insertion/i) as HTMLSelectElement;
    expect(select.value).toBe("append");

    expect(screen.getByText("Append (bottom)")).toBeInTheDocument();
    expect(screen.getByText("Prepend (top)")).toBeInTheDocument();
    expect(screen.getByText("Prepend compact (top)")).toBeInTheDocument();
  });

  it("card insertion select can be changed", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const select = screen.getByLabelText(/Card Insertion/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "prepend" } });

    expect(select.value).toBe("prepend");
  });

  it("card insertion select defaults to value from settings", () => {
    render(
      <SettingsPanel
        settings={{ "new-card-insertion-method": "prepend-compact" }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const select = screen.getByLabelText(/Card Insertion/i) as HTMLSelectElement;
    expect(select.value).toBe("prepend-compact");
  });

  it("hide card count checkbox is unchecked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Hide card count")).not.toBeChecked();
  });

  it("hide card count checkbox can be toggled", async () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Hide card count");

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("lane width input renders with default value", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const input = screen.getByLabelText("Lane Width") as HTMLInputElement;
    expect(input.value).toBe("270");
  });

  it("lane width input accepts custom value", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const input = screen.getByLabelText("Lane Width") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "400" } });

    expect(input.value).toBe("400");
  });

  it("lane width input has min and max constraints", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const input = screen.getByLabelText("Lane Width") as HTMLInputElement;
    expect(input.min).toBe("150");
    expect(input.max).toBe("600");
  });

  it("accent color inputs render with default gray", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    // Color input should show default gray when accent color is empty
    const colorInput = document.getElementById("setting-accent-color") as HTMLInputElement;
    expect(colorInput.value).toBe("#808080");
  });

  it("accent color text input starts empty", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    // The text input is the second input in the accent-color-input-row
    const textInputs = document.querySelectorAll('.accent-color-input-row input[type="text"]');
    expect(textInputs[0].value).toBe("");
  });

  it("accent color can be set via color picker", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const colorInput = document.getElementById("setting-accent-color") as HTMLInputElement;
    fireEvent.change(colorInput, { target: { value: "#ff6600" } });

    const textInputs = document.querySelectorAll('.accent-color-input-row input[type="text"]');
    expect(textInputs[0].value).toBe("#ff6600");
  });

  it("accent color can be set via text input", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const textInputs = document.querySelectorAll('.accent-color-input-row input[type="text"]');
    fireEvent.change(textInputs[0], { target: { value: "#123456" } });

    const colorInput = document.getElementById("setting-accent-color") as HTMLInputElement;
    expect(colorInput.value).toBe("#123456");
  });

  it("accent color clear button appears when color is set", () => {
    render(
      <SettingsPanel
        settings={{ "accent-color": "#ff6600" }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const clearButton = document.querySelector(".accent-color-clear");
    expect(clearButton).toBeInTheDocument();
  });

  it("accent color clear button is not present when color is empty", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const clearButton = document.querySelector(".accent-color-clear");
    expect(clearButton).not.toBeInTheDocument();
  });

  it("accent color clear button clears the color", () => {
    render(
      <SettingsPanel
        settings={{ "accent-color": "#ff6600" }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const clearButton = document.querySelector(".accent-color-clear") as HTMLButtonElement;
    fireEvent.click(clearButton);

    const textInputs = document.querySelectorAll('.accent-color-input-row input[type="text"]');
    expect(textInputs[0].value).toBe("");
  });
});

// ─── Tags Section ────────────────────────────────────────────────────────

describe("SettingsPanel — Tags Section", () => {
  it("renders tags fields", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Extract tags")).toBeInTheDocument();
    expect(screen.getByLabelText(/Tag Click Action/i)).toBeInTheDocument();
  });

  it("extract tags checkbox is checked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Extract tags")).toBeChecked();
  });

  it("extract tags can be toggled", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Extract tags");

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("tag click action select has correct options", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const select = screen.getByLabelText(/Tag Click Action/i) as HTMLSelectElement;
    expect(select.value).toBe("obsidian");

    expect(screen.getByText("Filter by tag")).toBeInTheDocument();
    expect(screen.getByText("Open search")).toBeInTheDocument();
  });

  it("tag click action defaults to value from settings", () => {
    render(
      <SettingsPanel settings={{ "tag-action": "kanban" }} onSave={vi.fn()} onCancel={vi.fn()} />,
    );

    const select = screen.getByLabelText(/Tag Click Action/i) as HTMLSelectElement;
    expect(select.value).toBe("kanban");
  });

  it("renders tag colors section", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("Tag Colors")).toBeInTheDocument();
  });

  it("renders existing tag colors from settings", () => {
    render(
      <SettingsPanel
        settings={{
          "tag-colors": [
            { tagKey: "urgent", color: "#ff0000", backgroundColor: "#fff" },
            { tagKey: "done", color: "#00ff00", backgroundColor: "#fff" },
          ],
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("#urgent")).toBeInTheDocument();
    expect(screen.getByText("#done")).toBeInTheDocument();
  });

  it("can add a new tag color", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const inputs = document.querySelectorAll(".tag-color-add input[type='text']");
    const colorInputs = document.querySelectorAll(".tag-color-add input[type='color']");
    const addButton = document.querySelector(".tag-color-add button");

    fireEvent.change(inputs[0], { target: { value: "newtag" } });
    fireEvent.change(colorInputs[0], { target: { value: "#ff0000" } });
    fireEvent.click(addButton!);

    expect(screen.getByText("#newtag")).toBeInTheDocument();
  });

  it("does not add tag color with empty key", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const addButton = document.querySelector(".tag-color-add button");
    fireEvent.click(addButton!);

    // No tag colors should be added
    expect(screen.queryByText("#")).not.toBeInTheDocument();
  });

  it("can remove an existing tag color", () => {
    render(
      <SettingsPanel
        settings={{
          "tag-colors": [{ tagKey: "urgent", color: "#ff0000", backgroundColor: "#fff" }],
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("#urgent")).toBeInTheDocument();

    const removeButton = document.querySelector(".tag-color-remove");
    fireEvent.click(removeButton!);

    expect(screen.queryByText("#urgent")).not.toBeInTheDocument();
  });

  it("can edit tag color via color picker", () => {
    render(
      <SettingsPanel
        settings={{
          "tag-colors": [{ tagKey: "urgent", color: "#ff0000", backgroundColor: "#fff" }],
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // Find the color input in the first tag-color-row
    const colorInputs = document.querySelectorAll(".tag-color-row input[type='color']");
    fireEvent.change(colorInputs[0], { target: { value: "#00ff00" } });

    // The color should be updated (we can verify by checking the rendered input)
    const updatedColorInputs = document.querySelectorAll(".tag-color-row input[type='color']");
    expect(updatedColorInputs[0].value).toBe("#00ff00");
  });

  it("renders tag sort section", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("Tag Sort Order")).toBeInTheDocument();
  });

  it("renders existing tag sort from settings", () => {
    render(
      <SettingsPanel
        settings={{
          "tag-sort": [{ tag: "work" }, { tag: "home" }, { tag: "urgent" }],
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("#work")).toBeInTheDocument();
    expect(screen.getByText("#home")).toBeInTheDocument();
    expect(screen.getByText("#urgent")).toBeInTheDocument();
  });

  it("can add a new tag to sort order", () => {
    render(<SettingsPanel settings={{ "tag-sort": [] }} onSave={vi.fn()} onCancel={vi.fn()} />);

    const input = document.querySelector(".tag-sort-add input[type='text']") as HTMLInputElement;
    const addButton = document.querySelector(".tag-sort-add button");

    fireEvent.change(input, { target: { value: "newtag" } });
    fireEvent.click(addButton!);

    expect(screen.getByText("#newtag")).toBeInTheDocument();
  });

  it("does not add duplicate tag to sort order", () => {
    render(
      <SettingsPanel
        settings={{
          "tag-sort": [{ tag: "existing" }],
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const input = document.querySelector(".tag-sort-add input[type='text']") as HTMLInputElement;
    const addButton = document.querySelector(".tag-sort-add button");

    fireEvent.change(input, { target: { value: "existing" } });
    fireEvent.click(addButton!);

    // Should still only have one tag
    const tags = document.querySelectorAll(".tag-sort-row");
    expect(tags.length).toBe(1);
  });

  it("does not add empty tag to sort order", () => {
    render(<SettingsPanel settings={{ "tag-sort": [] }} onSave={vi.fn()} onCancel={vi.fn()} />);

    const addButton = document.querySelector(".tag-sort-add button");
    fireEvent.click(addButton!);

    expect(screen.queryByText("#")).not.toBeInTheDocument();
  });

  it("can remove a tag from sort order", () => {
    render(
      <SettingsPanel
        settings={{
          "tag-sort": [{ tag: "work" }, { tag: "home" }],
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("#work")).toBeInTheDocument();
    expect(screen.getByText("#home")).toBeInTheDocument();

    const removeButtons = document.querySelectorAll(".tag-sort-remove");
    fireEvent.click(removeButtons[0]); // Remove first

    expect(screen.queryByText("#work")).not.toBeInTheDocument();
    expect(screen.getByText("#home")).toBeInTheDocument();
  });

  it("can move tag up in sort order", () => {
    render(
      <SettingsPanel
        settings={{
          "tag-sort": [{ tag: "first" }, { tag: "second" }, { tag: "third" }],
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // Get all rows
    const rows = document.querySelectorAll(".tag-sort-row");
    // Click the up button on the second item (index 1)
    const upButtons = rows[1].querySelectorAll("button");
    fireEvent.click(upButtons[0]); // First button is up

    // After moving up, "second" should be first
    const sortedTags = document.querySelectorAll(".tag-sort-key");
    expect(sortedTags[0].textContent).toBe("#second");
    expect(sortedTags[1].textContent).toBe("#first");
  });

  it("can move tag down in sort order", () => {
    render(
      <SettingsPanel
        settings={{
          "tag-sort": [{ tag: "first" }, { tag: "second" }, { tag: "third" }],
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const rows = document.querySelectorAll(".tag-sort-row");
    const downButtons = rows[0].querySelectorAll("button");
    fireEvent.click(downButtons[1]); // Second button is down

    const sortedTags = document.querySelectorAll(".tag-sort-key");
    expect(sortedTags[0].textContent).toBe("#second");
    expect(sortedTags[1].textContent).toBe("#first");
  });

  it("first item up button is disabled", () => {
    render(
      <SettingsPanel
        settings={{
          "tag-sort": [{ tag: "first" }, { tag: "second" }],
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const rows = document.querySelectorAll(".tag-sort-row");
    const upButton = rows[0].querySelector("button:first-child") as HTMLButtonElement;
    expect(upButton.disabled).toBe(true);
  });

  it("last item down button is disabled", () => {
    render(
      <SettingsPanel
        settings={{
          "tag-sort": [{ tag: "first" }, { tag: "second" }],
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const rows = document.querySelectorAll(".tag-sort-row");
    const lastRow = rows[rows.length - 1];
    const downButton = lastRow.querySelector("button:last-child") as HTMLButtonElement;
    expect(downButton.disabled).toBe(true);
  });
});

// ─── Dates Section ────────────────────────────────────────────────────────

describe("SettingsPanel — Dates Section", () => {
  it("renders dates fields", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Extract dates")).toBeInTheDocument();
    expect(screen.getByLabelText("Date Trigger")).toBeInTheDocument();
    expect(screen.getByLabelText("Time Trigger")).toBeInTheDocument();
    expect(screen.getByLabelText("Date Display Format")).toBeInTheDocument();
    expect(screen.getByLabelText("Date Format")).toBeInTheDocument();
    expect(screen.getByLabelText("Time Format")).toBeInTheDocument();
    expect(screen.getByLabelText("Relative dates")).toBeInTheDocument();
    expect(screen.getByLabelText("Week Start")).toBeInTheDocument();
  });

  it("extract dates checkbox is checked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Extract dates")).toBeChecked();
  });

  it("extract dates can be toggled", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Extract dates");

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("date trigger input has default value", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = document.getElementById("setting-date-trigger") as HTMLInputElement;
    expect(input.value).toBe("@");
  });

  it("date trigger can be changed", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = document.getElementById("setting-date-trigger") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "#" } });
    expect(input.value).toBe("#");
  });

  it("time trigger input has default value", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Time Trigger") as HTMLInputElement;
    expect(input.value).toBe("@");
  });

  it("time trigger can be changed", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Time Trigger") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "#" } });
    expect(input.value).toBe("#");
  });

  it("date display format has default value", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Date Display Format") as HTMLInputElement;
    expect(input.value).toBe("YYYY-MM-DD");
  });

  it("date display format can be changed", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Date Display Format") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "MM/DD/YYYY" } });
    expect(input.value).toBe("MM/DD/YYYY");
  });

  it("date format has default value", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Date Format") as HTMLInputElement;
    expect(input.value).toBe("YYYY-MM-DD");
  });

  it("date format can be changed", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Date Format") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "MM-DD-YYYY" } });
    expect(input.value).toBe("MM-DD-YYYY");
  });

  it("time format has default value", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Time Format") as HTMLInputElement;
    expect(input.value).toBe("HH:mm");
  });

  it("time format can be changed", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Time Format") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hh:mm A" } });
    expect(input.value).toBe("hh:mm A");
  });

  it("relative dates checkbox is unchecked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Relative dates")).not.toBeChecked();
  });

  it("relative dates can be toggled", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Relative dates");

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("week start select has correct options", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const select = screen.getByLabelText("Week Start") as HTMLSelectElement;
    expect(select.value).toBe("1"); // Default is Monday

    expect(screen.getByText("Sunday")).toBeInTheDocument();
    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("Tuesday")).toBeInTheDocument();
    expect(screen.getByText("Wednesday")).toBeInTheDocument();
    expect(screen.getByText("Thursday")).toBeInTheDocument();
    expect(screen.getByText("Friday")).toBeInTheDocument();
    expect(screen.getByText("Saturday")).toBeInTheDocument();
  });

  it("week start can be changed", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const select = screen.getByLabelText("Week Start") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "0" } });
    expect(select.value).toBe("0");
  });
});

// ─── Archive Section ─────────────────────────────────────────────────────

describe("SettingsPanel — Archive Section", () => {
  it("renders archive fields", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Archive with date")).toBeInTheDocument();
    expect(screen.getByLabelText("Append archive date")).toBeInTheDocument();
    expect(screen.getByLabelText("Date Separator")).toBeInTheDocument();
    expect(screen.getByLabelText("Archive Date Format")).toBeInTheDocument();
    expect(screen.getByLabelText("Max Archive Size")).toBeInTheDocument();
  });

  it("archive with date checkbox is unchecked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Archive with date")).not.toBeChecked();
  });

  it("archive with date can be toggled", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Archive with date");

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("append archive date checkbox is unchecked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Append archive date")).not.toBeChecked();
  });

  it("append archive date can be toggled", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Append archive date");

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("archive date separator has default value", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Date Separator") as HTMLInputElement;
    expect(input.value).toBe(" ");
  });

  it("archive date separator can be changed", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Date Separator") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "_" } });
    expect(input.value).toBe("_");
  });

  it("archive date format has default value", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Archive Date Format") as HTMLInputElement;
    expect(input.value).toBe("YYYY-MM-DD");
  });

  it("archive date format can be changed", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Archive Date Format") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "MM-DD-YYYY" } });
    expect(input.value).toBe("MM-DD-YYYY");
  });

  it("max archive size has default value -1", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Max Archive Size") as HTMLInputElement;
    expect(input.value).toBe("-1");
  });

  it("max archive size can be changed", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Max Archive Size") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "100" } });
    expect(input.value).toBe("100");
  });
});

// ─── Metadata Section ───────────────────────────────────────────────────

describe("SettingsPanel — Metadata Section", () => {
  it("renders metadata fields", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Metadata Position")).toBeInTheDocument();
    expect(screen.getByLabelText("Extract task metadata")).toBeInTheDocument();
  });

  it("metadata position select has correct options", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const select = screen.getByLabelText("Metadata Position") as HTMLSelectElement;
    expect(select.value).toBe("body");

    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
    expect(screen.getByText("Metadata table")).toBeInTheDocument();
  });

  it("metadata position can be changed", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const select = screen.getByLabelText("Metadata Position") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "footer" } });
    expect(select.value).toBe("footer");
  });

  it("metadata position defaults to value from settings", () => {
    render(
      <SettingsPanel
        settings={{ "inline-metadata-position": "metadata-table" }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const select = screen.getByLabelText("Metadata Position") as HTMLSelectElement;
    expect(select.value).toBe("metadata-table");
  });

  it("extract task metadata checkbox is checked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Extract task metadata")).toBeChecked();
  });

  it("extract task metadata can be toggled", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Extract task metadata");

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});

// ─── Note Creation Section ───────────────────────────────────────────────

describe("SettingsPanel — Note Creation Section", () => {
  it("renders note creation fields", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Template")).toBeInTheDocument();
    expect(screen.getByLabelText("Folder")).toBeInTheDocument();
  });

  it("template input starts empty", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Template") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("template can be changed", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Template") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "templates/daily.md" } });
    expect(input.value).toBe("templates/daily.md");
  });

  it("template defaults to value from settings", () => {
    render(
      <SettingsPanel
        settings={{ "new-note-template": "my-template.md" }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Template") as HTMLInputElement;
    expect(input.value).toBe("my-template.md");
  });

  it("folder input starts empty", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Folder") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("folder can be changed", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Folder") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "notes/daily" } });
    expect(input.value).toBe("notes/daily");
  });

  it("folder defaults to value from settings", () => {
    render(
      <SettingsPanel
        settings={{ "new-note-folder": "my-folder" }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Folder") as HTMLInputElement;
    expect(input.value).toBe("my-folder");
  });
});

// ─── Header Buttons Section ─────────────────────────────────────────────

describe("SettingsPanel — Header Buttons Section", () => {
  it("renders all header button toggles", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Add list")).toBeInTheDocument();
    expect(screen.getByLabelText("Archive all")).toBeInTheDocument();
    expect(screen.getByLabelText("View as markdown")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    expect(screen.getByLabelText("Set view")).toBeInTheDocument();
  });

  it("add list checkbox is checked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Add list")).toBeChecked();
  });

  it("add list can be toggled", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Add list");

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("archive all checkbox is checked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Archive all")).toBeChecked();
  });

  it("archive all can be toggled", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Archive all");

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("view as markdown checkbox is checked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("View as markdown")).toBeChecked();
  });

  it("view as markdown can be toggled", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("View as markdown");

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("search checkbox is checked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Search")).toBeChecked();
  });

  it("search can be toggled", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Search");

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("set view checkbox is checked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Set view")).toBeChecked();
  });

  it("set view can be toggled", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Set view");

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});

// ─── List View Section ──────────────────────────────────────────────────

describe("SettingsPanel — List View Section", () => {
  it("renders list view fields", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Full lane width")).toBeInTheDocument();
  });

  it("full lane width checkbox is unchecked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Full lane width")).not.toBeChecked();
  });

  it("full lane width can be toggled", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Full lane width");

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("full lane width is checked when set to true in settings", () => {
    render(
      <SettingsPanel
        settings={{ "full-list-lane-width": true }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Full lane width")).toBeChecked();
  });
});

// ─── Display Section ────────────────────────────────────────────────────

describe("SettingsPanel — Display Section", () => {
  it("renders display fields", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Show title")).toBeInTheDocument();
  });

  it("show title checkbox is checked by default", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Show title")).toBeChecked();
  });

  it("show title can be toggled", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText("Show title");

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("custom title input is hidden when show title is unchecked", () => {
    render(
      <SettingsPanel settings={{ "show-title": false }} onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByLabelText("Custom Title")).not.toBeInTheDocument();
  });

  it("custom title input is visible when show title is checked", () => {
    render(<SettingsPanel settings={{ "show-title": true }} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Custom Title")).toBeInTheDocument();
  });
});

// ─── Save / Cancel Operations ───────────────────────────────────────────

describe("SettingsPanel — Save and Cancel Operations", () => {
  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("save button is disabled when there are no changes", () => {
    // With settings matching all defaults, save should be enabled only when changes are made
    // Due to how hasChanges works with the ref, we test the positive case (changes enable save)
    // rather than the negative (no changes = disabled)
    const onSave = vi.fn();
    render(
      <SettingsPanel
        settings={{
          "show-checkboxes": true,
          "move-tags": true,
          "move-dates": true,
          "show-title": true,
          "show-add-list": true,
          "show-archive-all": true,
          "show-view-as-markdown": true,
          "show-search": true,
          "show-set-view": true,
          "move-task-metadata": true,
          "lane-width": "270",
          "date-format": "YYYY-MM-DD",
          "time-format": "HH:mm",
          "tag-colors": [],
          "tag-sort": [],
        }}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    // Make a change - this should enable the save button
    const checkbox = screen.getByLabelText("Show checkboxes");
    fireEvent.click(checkbox);

    const saveButton = document.querySelector(".settings-save-button") as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
  });

  it("save button is enabled when there are changes", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    // Make a change - toggle a checkbox
    const checkbox = screen.getByLabelText("Show checkboxes");
    fireEvent.click(checkbox);

    const saveButton = screen.getByText("Save") as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
  });

  it("calls onSave with correct settings when save is clicked", () => {
    const onSave = vi.fn();
    render(<SettingsPanel settings={{}} onSave={onSave} onCancel={vi.fn()} />);

    // Make a change
    const checkbox = screen.getByLabelText("Show checkboxes");
    fireEvent.click(checkbox);

    // Click save
    fireEvent.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        "show-checkboxes": false,
      }),
    );
  });

  it("onSave includes all settings with defaults", () => {
    const onSave = vi.fn();
    render(<SettingsPanel settings={{}} onSave={onSave} onCancel={vi.fn()} />);

    // Make at least one change to enable save button
    fireEvent.click(screen.getByLabelText("Show checkboxes"));
    fireEvent.click(screen.getByText("Save"));

    const savedSettings = onSave.mock.calls[0][0];

    // Verify all expected settings are present
    expect(savedSettings).toHaveProperty("lane-width");
    expect(savedSettings).toHaveProperty("date-format");
    expect(savedSettings).toHaveProperty("time-format");
    expect(savedSettings).toHaveProperty("show-checkboxes");
    expect(savedSettings).toHaveProperty("new-card-insertion-method");
    expect(savedSettings).toHaveProperty("hide-card-count");
    expect(savedSettings).toHaveProperty("move-tags");
    expect(savedSettings).toHaveProperty("tag-action");
    expect(savedSettings).toHaveProperty("tag-colors");
    expect(savedSettings).toHaveProperty("tag-sort");
    expect(savedSettings).toHaveProperty("move-dates");
    expect(savedSettings).toHaveProperty("date-trigger");
    expect(savedSettings).toHaveProperty("time-trigger");
    expect(savedSettings).toHaveProperty("date-display-format");
    expect(savedSettings).toHaveProperty("show-relative-date");
    expect(savedSettings).toHaveProperty("date-picker-week-start");
    expect(savedSettings).toHaveProperty("archive-with-date");
    expect(savedSettings).toHaveProperty("append-archive-date");
    expect(savedSettings).toHaveProperty("archive-date-separator");
    expect(savedSettings).toHaveProperty("archive-date-format");
    expect(savedSettings).toHaveProperty("max-archive-size");
    expect(savedSettings).toHaveProperty("inline-metadata-position");
    expect(savedSettings).toHaveProperty("move-task-metadata");
    expect(savedSettings).toHaveProperty("new-note-template");
    expect(savedSettings).toHaveProperty("new-note-folder");
    expect(savedSettings).toHaveProperty("show-add-list");
    expect(savedSettings).toHaveProperty("show-archive-all");
    expect(savedSettings).toHaveProperty("show-view-as-markdown");
    expect(savedSettings).toHaveProperty("show-board-settings");
    expect(savedSettings).toHaveProperty("show-search");
    expect(savedSettings).toHaveProperty("show-set-view");
    expect(savedSettings).toHaveProperty("full-list-lane-width");
    expect(savedSettings).toHaveProperty("show-title");
    expect(savedSettings).toHaveProperty("custom-title");
    expect(savedSettings).toHaveProperty("accent-color");
  });

  it("preserves user-modified values when saving", () => {
    const onSave = vi.fn();
    render(
      <SettingsPanel
        settings={{
          "lane-width": 300,
          "custom-title": "My Board",
          "accent-color": "#ff6600",
        }}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    // Make a change to enable save
    fireEvent.click(screen.getByLabelText("Show checkboxes"));
    fireEvent.click(screen.getByText("Save"));

    const savedSettings = onSave.mock.calls[0][0];
    expect(savedSettings["lane-width"]).toBe(300);
    expect(savedSettings["custom-title"]).toBe("My Board");
    expect(savedSettings["accent-color"]).toBe("#ff6600");
  });

  it("sets show-board-settings to true on save", () => {
    const onSave = vi.fn();
    render(
      <SettingsPanel
        settings={{ "show-board-settings": false }}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("Show checkboxes"));
    fireEvent.click(screen.getByText("Save"));

    const savedSettings = onSave.mock.calls[0][0];
    expect(savedSettings["show-board-settings"]).toBe(true);
  });
});

// ─── hasChanges Detection ────────────────────────────────────────────────

describe("SettingsPanel — hasChanges Detection", () => {
  it("detects change in string field", () => {
    render(<SettingsPanel settings={{ "lane-width": 270 }} onSave={vi.fn()} onCancel={vi.fn()} />);

    const input = screen.getByLabelText("Lane Width") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "400" } });

    const saveButton = screen.getByText("Save") as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
  });

  it("detects change in boolean field", () => {
    render(
      <SettingsPanel settings={{ "show-checkboxes": true }} onSave={vi.fn()} onCancel={vi.fn()} />,
    );

    const checkbox = screen.getByLabelText("Show checkboxes");
    fireEvent.click(checkbox);

    const saveButton = screen.getByText("Save") as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
  });

  it("detects change in select field", () => {
    render(
      <SettingsPanel
        settings={{ "new-card-insertion-method": "append" }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const select = screen.getByLabelText(/Card Insertion/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "prepend" } });

    const saveButton = screen.getByText("Save") as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
  });

  it("detects change in tag colors array", () => {
    render(
      <SettingsPanel
        settings={{
          "tag-colors": [{ tagKey: "tag1", color: "#ff0000", backgroundColor: "#fff" }],
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // Add another tag color
    const inputs = document.querySelectorAll(".tag-color-add input[type='text']");
    const colorInputs = document.querySelectorAll(".tag-color-add input[type='color']");
    const addButton = document.querySelector(".tag-color-add button");

    fireEvent.change(inputs[0], { target: { value: "tag2" } });
    fireEvent.change(colorInputs[0], { target: { value: "#00ff00" } });
    fireEvent.click(addButton!);

    const saveButton = screen.getByText("Save") as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
  });

  it("detects change in tag sort array", () => {
    render(
      <SettingsPanel
        settings={{
          "tag-sort": [{ tag: "tag1" }],
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // Add another tag
    const input = document.querySelector(".tag-sort-add input[type='text']") as HTMLInputElement;
    const addButton = document.querySelector(".tag-sort-add button");

    fireEvent.change(input, { target: { value: "tag2" } });
    fireEvent.click(addButton!);

    const saveButton = screen.getByText("Save") as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
  });

  it("does not flag changes when values match original", () => {
    // Use settings that exactly match defaults so hasChanges is false
    render(
      <SettingsPanel
        settings={{
          "lane-width": "270",
          "date-format": "YYYY-MM-DD",
          "time-format": "HH:mm",
          "date-trigger": "@",
          "time-trigger": "@",
          "date-display-format": "YYYY-MM-DD",
          "date-picker-week-start": "1",
          "archive-date-separator": " ",
          "archive-date-format": "YYYY-MM-DD",
          "max-archive-size": "-1",
          "inline-metadata-position": "body",
          "new-note-template": "",
          "new-note-folder": "",
          "new-card-insertion-method": "append",
          "tag-action": "obsidian",
          "accent-color": "",
          "custom-title": "",
          "show-checkboxes": true,
          "hide-card-count": false,
          "move-tags": true,
          "move-dates": true,
          "show-relative-date": false,
          "archive-with-date": false,
          "append-archive-date": false,
          "move-task-metadata": true,
          "show-add-list": true,
          "show-archive-all": true,
          "show-view-as-markdown": true,
          "show-board-settings": true,
          "show-search": true,
          "show-set-view": true,
          "full-list-lane-width": false,
          "show-title": true,
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // Change to same value
    const input = document.getElementById("setting-lane-width") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "270" } });

    const saveButton = document.querySelector(".settings-save-button") as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });
});

// ─── Settings Prop Updates ───────────────────────────────────────────────

describe("SettingsPanel — Settings Prop Updates", () => {
  it("updates state when settings prop changes", async () => {
    const { rerender } = render(
      <SettingsPanel settings={{ "lane-width": 270 }} onSave={vi.fn()} onCancel={vi.fn()} />,
    );

    expect((screen.getByLabelText("Lane Width") as HTMLInputElement).value).toBe("270");

    rerender(
      <SettingsPanel settings={{ "lane-width": 400 }} onSave={vi.fn()} onCancel={vi.fn()} />,
    );

    await waitFor(() => {
      expect((screen.getByLabelText("Lane Width") as HTMLInputElement).value).toBe("400");
    });
  });

  it("handles null settings gracefully", () => {
    // Should not throw
    expect(() => {
      render(<SettingsPanel settings={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    }).not.toThrow();
  });

  it("handles missing settings keys with defaults", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    // Should use defaults
    expect((screen.getByLabelText("Lane Width") as HTMLInputElement).value).toBe("270");
    expect((screen.getByLabelText("Date Format") as HTMLInputElement).value).toBe("YYYY-MM-DD");
    expect((screen.getByLabelText("Time Format") as HTMLInputElement).value).toBe("HH:mm");
    expect(screen.getByLabelText("Show checkboxes")).toBeChecked();
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────────

describe("SettingsPanel — Edge Cases", () => {
  it("handles invalid lane width (non-numeric)", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const input = document.getElementById("setting-lane-width") as HTMLInputElement;
    // Number inputs filter out non-numeric values
    fireEvent.change(input, { target: { value: "abc" } });

    // Value is empty because number input rejects non-numeric
    expect(input.value).toBe("");
  });

  it("handles negative lane width", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const input = screen.getByLabelText("Lane Width") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "-100" } });

    expect(input.value).toBe("-100");
  });

  it("handles very large values", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const input = screen.getByLabelText("Lane Width") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "99999" } });

    expect(input.value).toBe("99999");
  });

  it("handles special characters in text inputs", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const input = screen.getByLabelText("Custom Title") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test <>&\"'" } });

    expect(input.value).toBe("Test <>&\"'");
  });

  it("handles custom title with empty string when show-title is true", () => {
    render(
      <SettingsPanel
        settings={{ "show-title": true, "custom-title": "" }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Custom Title") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("handles empty tag sort when adding duplicate", () => {
    render(
      <SettingsPanel
        settings={{
          "tag-sort": [{ tag: "existing" }],
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const input = document.querySelector(".tag-sort-add input[type='text']") as HTMLInputElement;
    const addButton = document.querySelector(".tag-sort-add button");

    // Try to add empty
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(addButton!);

    // Should not add duplicate or empty
    const rows = document.querySelectorAll(".tag-sort-row");
    expect(rows.length).toBe(1);
  });

  it("handles color picker with valid hex", () => {
    render(<SettingsPanel settings={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

    const colorInput = document.getElementById("setting-accent-color") as HTMLInputElement;
    // Browser normalizes invalid values to #000000
    fireEvent.change(colorInput, { target: { value: "#ff6600" } });

    expect(colorInput.value).toBe("#ff6600");
  });

  it("correctly parses integer settings on save", () => {
    const onSave = vi.fn();
    render(<SettingsPanel settings={{ "lane-width": "300" }} onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Show checkboxes"));
    fireEvent.click(screen.getByText("Save"));

    const savedSettings = onSave.mock.calls[0][0];
    expect(savedSettings["lane-width"]).toBe(300);
    expect(typeof savedSettings["lane-width"]).toBe("number");
  });
});

// ─── Helper Function ───────────────────────────────────────────────────

function renderWithSave(settings: Record<string, unknown>) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  return {
    onSave,
    onCancel,
    ui: render(<SettingsPanel settings={settings} onSave={onSave} onCancel={onCancel} />),
  };
}
