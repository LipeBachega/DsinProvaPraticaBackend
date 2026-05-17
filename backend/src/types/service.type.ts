export type serviceType = "Corte de Cabelo" | "Manicure" | "Pintura";
export interface IService {
  id: number;
  name: string;
  price: number;
  serviceType: serviceType;
}
