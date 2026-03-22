// helper functions for multi-value query params

// turn "a, b ,c" into ["a", "b", "c"]
export function parseMultiParam(value?: string) {
    if (!value) return []

    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
}

// turn ["a", "b"] into "a,b" for the URL
export function joinMultiParam(values: string[]) {
    return values.join(',')
}

// checkbox behavior: if `value` is already selected, remove it, otherwise add it
export function toggleValue(values: string[], value: string) {
    if (values.includes(value)) {
        return values.filter((item) => item !== value)
    }

    return [...values, value]
}
