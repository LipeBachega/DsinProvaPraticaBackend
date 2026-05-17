export type serviceType = "Corte de Cabelo" | "Manicure" | "Pintura";
export interface IService {
  id: number;
  price: number;
  serviceType: serviceType;
}
