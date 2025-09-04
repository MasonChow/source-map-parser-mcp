declare module 'source_map_parser_node' {
  export function init(): Promise<void>;
  export function generate_token_by_single_stack(
    line: number,
    column: number,
    sourceMap: string,
    contextOffset?: number
  ): string;
  
  // Add other functions from the package as needed
  export function lookup_token(
    sourceMap: string,
    line: number,
    column: number
  ): string;
  
  export function lookup_token_with_context(
    sourceMap: string,
    line: number,
    column: number,
    contextLines: number
  ): string;
  
  export function map_error_stack(
    sourceMap: string,
    errorStack: string,
    contextLines?: number
  ): string;
}