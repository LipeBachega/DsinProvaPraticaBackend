const BRAZIL_TIME_ZONE = "America/Sao_Paulo";
const BRAZIL_OFFSET = "-03:00";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BRAZIL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BRAZIL_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BRAZIL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function getParts(
  date: Date,
): Record<"year" | "month" | "day" | "hour" | "minute" | "second", string> {
  // Extraimos as partes no fuso de Brasilia para evitar misturar UTC com hora local.
  const parts = dateTimeFormatter.formatToParts(date);

  const values = {
    year: "0000",
    month: "00",
    day: "00",
    hour: "00",
    minute: "00",
    second: "00",
  };

  for (const part of parts) {
    if (
      part.type === "year" ||
      part.type === "month" ||
      part.type === "day" ||
      part.type === "hour" ||
      part.type === "minute" ||
      part.type === "second"
    ) {
      values[part.type] = part.value;
    }
  }

  return values;
}

function buildBrazilDateTime(
  year: string,
  month: string,
  day: string,
  hour: string,
  minute: string,
  second: string,
): string {
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${BRAZIL_OFFSET}`;
}

export function parseBrazilDate(date: string): Date {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return new Date(date);
  }

  const [, year, month, day] = match;
  return new Date(`${year}-${month}-${day}T00:00:00${BRAZIL_OFFSET}`);
}

export function parseBrazilDateTime(dateTime: string | Date): Date {
  if (dateTime instanceof Date) {
    return new Date(dateTime);
  }

  // Se o front ja mandou timezone explicito, respeitamos exatamente o instante recebido.
  const hasExplicitTimeZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(dateTime);

  if (hasExplicitTimeZone) {
    return new Date(dateTime);
  }

  const dateOnlyMatch = dateTime.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    return parseBrazilDate(dateTime);
  }

  return new Date(`${dateTime}${BRAZIL_OFFSET}`);
}

export function formatBrazilDateTime(date: Date | string): string {
  const parsedDate = new Date(date);
  const { year, month, day, hour, minute, second } = getParts(parsedDate);

  return buildBrazilDateTime(year, month, day, hour, minute, second);
}

export function formatBrazilTime(date: Date | string): string {
  return timeFormatter.format(new Date(date));
}

export function getBrazilDayRange(date: Date | string): {
  start: Date;
  end: Date;
} {
  const parsedDate = new Date(date);
  const formattedDate = dateFormatter.format(parsedDate);

  // O range diario e montado em Brasilia para consultas no banco nao "virarem o dia" em UTC.
  return {
    start: new Date(`${formattedDate}T00:00:00${BRAZIL_OFFSET}`),
    end: new Date(`${formattedDate}T23:59:59${BRAZIL_OFFSET}`),
  };
}

export function getBrazilWeekRange(date: Date | string): {
  start: Date;
  end: Date;
} {
  const parsedDate = new Date(date);
  const localParts = getParts(parsedDate);
  // Usamos meio-dia local como ancora para calcular a semana sem sofrer com bordas de timezone.
  const localMidday = new Date(
    `${localParts.year}-${localParts.month}-${localParts.day}T12:00:00${BRAZIL_OFFSET}`,
  );
  const currentDay = localMidday.getUTCDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  localMidday.setUTCDate(localMidday.getUTCDate() + distanceToMonday);

  const start = new Date(localMidday);
  start.setUTCHours(3, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(26, 59, 59, 999);

  return { start, end };
}

export function isSameBrazilCalendarDay(
  firstDate: Date | string,
  secondDate: Date | string,
): boolean {
  return (
    dateFormatter.format(new Date(firstDate)) ===
    dateFormatter.format(new Date(secondDate))
  );
}
