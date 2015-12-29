#encoding "utf-8"

CityW -> 'город';
CitySokr -> 'г';

CityDescr -> CityW | CitySokr;

CityNameNoun -> (Adj<gnc-agr[1]>) Word<gnc-agr[1],rt> (Word<gram="род">);

City -> CityDescr CityNameNoun<gram="род", h-reg1>;
City -> CityDescr CityNameNoun<gram="им", h-reg1>;

StreetW -> 'проспект' | 'проезд' | 'улица' | 'шоссе';
StreetSokr -> 'пр' | 'просп' | 'пр-д' | 'ул' | 'ш';

StreetDescr -> StreetW | StreetSokr;

StreetNameNoun -> (Adj<gnc-agr[1]>) Word<gnc-agr[1],rt> (Word<gram="род">);

NumberW_1 -> AnyWord<wff=/[1-9]?[0-9]-?((ый)|(ий)|(ой)|й)/> {outgram="муж,ед,им"};
NumberW_2 -> AnyWord<wff=/[1-9]?[0-9]-?((ая)|(яя)|(ья)|я)/> {outgram="жен,ед,им"};
NumberW_3 -> AnyWord<wff=/[1-9]?[0-9]-?((ее)|(ье)|(ое)|е)/> {outgram="сред,ед,им"};

NumberW -> NumberW_1 | NumberW_2 | NumberW_3;

StreetNameAdj -> Adj<h-reg1> Adj*;
StreetNameAdj -> NumberW<gnc-agr[1]> Adj<gnc-agr[1]>;

Street -> StreetDescr StreetNameNoun<gram="род", h-reg1>;
Street -> StreetDescr StreetNameNoun<gram="им", h-reg1>;
Street -> StreetNameAdj<gnc-agr[1]> StreetW<gnc-agr[1]>;
Street -> StreetNameAdj StreetSokr;

//Выше мы описали только цепочки название - дескриптор, но в некоторых адресах порядок другой.
//Добавляем правила для адресов с дескриптором, идущим перед названием улицы.
Street -> StreetW<gnc-agr[1]> StreetNameAdj<gnc-agr[1]>;
Street -> StreetSokr StreetNameAdj;

Address -> City;
Address -> Street;

S -> Address interp (Address.Field1::not_norm);