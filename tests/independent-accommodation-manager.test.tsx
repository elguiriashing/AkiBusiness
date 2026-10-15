// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { IndependentAccommodationManager } from "../src/components/IndependentAccommodationManager";
const property = "11111111-1111-4111-8111-111111111111";
const room = "22222222-2222-4222-8222-222222222222";
const fetchMock = vi.fn();
const empty = () =>
  Object.fromEntries(
    [
      "room_types",
      "units",
      "nightly_rates",
      "unit_blocks",
      "booking_settings",
      "reservations",
      "property_media",
    ].map((section) => [section, { rows: [] }]),
  );
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it.each(["en", "es"] as const)(
  "creates an independent private property with no venue ID in %s",
  async (locale) => {
    fetchMock.mockImplementation(async (_url, options) => ({
      ok: true,
      json: async () =>
        options?.method === "POST"
          ? { property }
          : String(_url).includes("?property=")
            ? empty()
            : { properties: [] },
    }));
    render(<IndependentAccommodationManager locale={locale} />);
    const name = await screen.findByLabelText(
      locale === "es" ? "Nombre" : "Name",
    );
    fireEvent.change(name, { target: { value: "Private stay" } });
    fireEvent.submit(name.closest("form")!);
    await screen.findByRole("button", {
      name: locale === "es" ? "Todos mis alojamientos" : "All my accommodation",
    });
    const call = fetchMock.mock.calls.find(
      ([, options]) => options?.method === "POST",
    )!;
    expect(JSON.parse(call[1].body)).toEqual({
      action: "create",
      name: "Private stay",
    });
  },
);
it("keeps room inventory read failures distinct from empty and disables dependent unit creation", async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ ...empty(), room_types: { error: "unavailable" } }),
  });
  render(
    <IndependentAccommodationManager locale="en" initialProperty={property} />,
  );
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Units" }));
  expect(
    (await screen.findByRole("button", { name: "Save" })).closest("fieldset")
      ?.disabled,
  ).toBe(true);
});
it("writes room and rate changes against the selected property only", async () => {
  fetchMock.mockImplementation(async (_url, options) => ({
    ok: true,
    json: async () =>
      options?.method === "POST"
        ? { result: [{ id: room }] }
        : {
            ...empty(),
            room_types: {
              rows: [{ id: room, name: "Double", max_guests: 2, active: true }],
            },
          },
  }));
  render(
    <IndependentAccommodationManager locale="en" initialProperty={property} />,
  );
  await screen.findByText("Double");
  fireEvent.click(screen.getByRole("button", { name: "Nightly rates" }));
  fireEvent.change(screen.getByLabelText("Room type"), {
    target: { value: room },
  });
  fireEvent.change(screen.getByLabelText("From"), {
    target: { value: "2027-01-01" },
  });
  fireEvent.change(screen.getByLabelText("Until (exclusive)"), {
    target: { value: "2027-01-04" },
  });
  fireEvent.change(screen.getByLabelText("Nightly price (EUR)"), {
    target: { value: "120.50" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Save" }).closest("form")!,
  );
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(([, options]) => options?.method === "POST"),
    ).toBe(true),
  );
  const call = fetchMock.mock.calls.find(
    ([, options]) => options?.method === "POST",
  )!;
  expect(JSON.parse(call[1].body)).toEqual({
    action: "rate",
    property,
    roomType: room,
    start: "2027-01-01",
    end: "2027-01-04",
    cents: 12050,
    minimumNights: 1,
  });
});
it("retains typed values after rejected mutation and never claims success", async () => {
  fetchMock.mockImplementation(async (_url, options) => ({
    ok: options?.method !== "POST",
    json: async () =>
      options?.method === "POST" ? { error: "forbidden" } : empty(),
  }));
  render(
    <IndependentAccommodationManager locale="en" initialProperty={property} />,
  );
  const input = await screen.findByLabelText("Name");
  fireEvent.change(input, { target: { value: "Unsaved suite" } });
  fireEvent.submit(input.closest("form")!);
  await screen.findByRole("alert");
  expect((input as HTMLInputElement).value).toBe("Unsaved suite");
});
it("edits loaded profile without fabricating publication or dropping existing fields", async () => {
  const original = {
    id: property,
    name: "Private stay",
    address: "Existing address",
    city: "Malaga",
    latitude: 36.7,
    longitude: -4.4,
    accommodation_type: "hotel",
    website_url: "https://example.com",
    description_es: "Texto",
    description_en: "Description",
  };
  fetchMock.mockImplementation(async (_url, options) => ({
    ok: true,
    json: async () =>
      options?.method === "POST"
        ? { result: true }
        : { ...empty(), profile: { rows: [original] } },
  }));
  render(
    <IndependentAccommodationManager locale="en" initialProperty={property} />,
  );
  await screen.findByRole("button", { name: "Property profile" });
  fireEvent.click(screen.getByRole("button", { name: "Property profile" }));
  expect((screen.getByLabelText("Address") as HTMLInputElement).value).toBe(
    "Existing address",
  );
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Updated stay" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Save" }).closest("form")!,
  );
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(([, options]) => options?.method === "POST"),
    ).toBe(true),
  );
  const body = JSON.parse(
    fetchMock.mock.calls.find(([, options]) => options?.method === "POST")![1]
      .body,
  );
  expect(body).toEqual({
    action: "profile",
    property,
    submit: false,
    profile: {
      name: "Updated stay",
      address: "Existing address",
      city: "Malaga",
      latitude: 36.7,
      longitude: -4.4,
      accommodation_type: "hotel",
      website_url: "https://example.com",
      description_es: "Texto",
      description_en: "Description",
    },
  });
});
