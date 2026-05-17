export default interface IResponse<Type> {
  status: number;
  success: boolean;
  message: string;
  error?: any;
  data?: Type;
}
