export default interface IResponse<T = unknown> {
  status: number;
  success: boolean;
  message: string;
  error?: any;
  data?: T;
}
