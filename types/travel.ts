export type AirportCode = string

export type TravelSegment = {
  date: string
  departAirport: AirportCode
  departTime: string
  arriveAirport: AirportCode
  arriveTime: string
  flight?: string
  seat?: string
  confirmation?: string
}

export type Connection = TravelSegment

export type TravelSection = 'arrival' | 'departure'

export type Travel = {
  arrival: TravelSegment
  departure: TravelSegment
  connections: {
    arrival: Connection[]
    departure: Connection[]
  }
}